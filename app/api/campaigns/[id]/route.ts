import { NextResponse } from 'next/server'
import { deleteCampaign as deleteInstantlyCampaign, updateCampaign } from '../../../../lib/instantly/client'
import supabase from '../../../../lib/supabase/server'
import { DEFAULT_TIMEZONE, INSTANTLY_TIMEZONES } from '../../../../lib/timezones'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'

type NormalizedSequence = {
  step_number: number
  delay_days: number
  subject_variable: string
  body_variable: string
  subject: string
  body: string
}

function mapDays(days: any) {
  if (Array.isArray(days)) {
    const [sunday, monday, tuesday, wednesday, thursday, friday, saturday] = days
    return { sunday, monday, tuesday, wednesday, thursday, friday, saturday }
  }

  return {
    monday: Boolean(days?.monday),
    tuesday: Boolean(days?.tuesday),
    wednesday: Boolean(days?.wednesday),
    thursday: Boolean(days?.thursday),
    friday: Boolean(days?.friday),
    saturday: Boolean(days?.saturday),
    sunday: Boolean(days?.sunday)
  }
}

function mapInstantlyStatus(status: unknown) {
  const statuses: Record<string, string> = {
    '-99': 'account_suspended',
    '-1': 'accounts_unhealthy',
    '-2': 'bounce_protect',
    '0': 'draft',
    '1': 'active',
    '2': 'paused',
    '3': 'completed',
    '4': 'running_subsequences'
  }

  return statuses[String(status)] || 'draft'
}

function normalizeTimezone(timezone: unknown) {
  if (typeof timezone === 'string' && (INSTANTLY_TIMEZONES as readonly string[]).includes(timezone)) {
    return timezone
  }

  return DEFAULT_TIMEZONE
}

function normalizeRequiredText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getCampaignOwnerFields(body: any, existingCampaign: any) {
  const owner = body?.campaign_owner || {}

  return {
    companyName: normalizeRequiredText(body?.company_name ?? owner.company_name ?? existingCampaign?.company_name),
    createdFromCompany: normalizeRequiredText(body?.created_from_company ?? owner.created_from_company ?? existingCampaign?.created_from_company)
  }
}

function buildInstantlyPayload(campaign: any, sequences: any[] = []) {
  const schedule = campaign?.campaign_schedule?.schedules?.[0] || {}
  const timezone = normalizeTimezone(campaign?.timezone || schedule?.timezone)
  const fromTime = campaign?.from_time || schedule?.timing?.from || '09:00'
  const toTime = campaign?.to_time || schedule?.timing?.to || '17:00'
  const stepRows = Array.isArray(sequences) && sequences.length > 0 ? sequences : []

  return {
    name: campaign?.name,
    campaign_schedule: {
      schedules: [
        {
          name: schedule?.name || 'Default Schedule',
          timezone,
          days: mapDays(schedule?.days),
          timing: {
            from: fromTime,
            to: toTime
          }
        }
      ]
    },
    email_gap: Number(campaign?.email_gap ?? 10),
    daily_limit: Number(campaign?.daily_limit ?? 50),
    stop_on_reply: Boolean(campaign?.stop_on_reply ?? true),
    open_tracking: Boolean(campaign?.open_tracking ?? false),
    link_tracking: Boolean(campaign?.link_tracking ?? true),
    sequences: stepRows.length
      ? stepRows.map((sequence: any) => ({
          steps: [
            {
              type: 'email',
              delay: sequence.delay_days || 0,
              delay_unit: 'days',
              variants: [
                {
                  subject: sequence.subject_variable || sequence.subject,
                  body: sequence.body_variable || sequence.body
                }
              ]
            }
          ]
        }))
      : undefined
  }
}

function normalizeCampaignRow(campaign: any) {
  if (!campaign) return campaign

  return {
    ...campaign,
    status: mapInstantlyStatus(campaign.status)
  }
}

function applyCampaignScope(query: any, auth: { userId: string; organizationId: string | null }) {
  if (auth.organizationId) {
    return query.eq('organization_id', auth.organizationId)
  }

  return query.eq('created_by', auth.userId)
}

function isInstantlyNotFoundError(error: any) {
  const message = String(error?.message || error?.data?.message || error?.data?.error || '')
  return error?.status === 404 || message.toLowerCase().includes('not found')
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const { data, error } = await applyCampaignScope(
      supabase.from('campaigns').select('*').eq('id', params.id),
      auth
    ).single()
    if (error) return NextResponse.json({ data: null, error: error.message })

    const { data: sequences, error: sequenceError } = await supabase
      .from('sequences')
      .select('*')
      .eq('campaign_id', params.id)
      .order('step_number', { ascending: true })

    if (sequenceError) return NextResponse.json({ data: null, error: sequenceError.message })

    let leadsQuery = supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .or(`campaign_id.eq.${params.id},campaign_ids.cs.{${params.id}}`)

    if (auth.organizationId) {
      leadsQuery = leadsQuery.eq('organization_id', auth.organizationId)
    }

    const { count: totalLeads, error: leadsCountError } = await leadsQuery

    if (leadsCountError) return NextResponse.json({ data: null, error: leadsCountError.message })

    return NextResponse.json({ data: { ...normalizeCampaignRow(data), sequences: sequences || [], totalLeads: totalLeads ?? 0 }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const body = await req.json()

    const { data: existingCampaign, error: existingError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', params.id)
      .match(auth.organizationId ? { organization_id: auth.organizationId } : { created_by: auth.userId })
      .single()

    if (existingError) return NextResponse.json({ data: null, error: existingError.message })

    const campaignOwner = getCampaignOwnerFields(body, existingCampaign)
    if (!campaignOwner.companyName || !campaignOwner.createdFromCompany) {
      return NextResponse.json({ data: null, error: 'Campaign owner details are required' }, { status: 400 })
    }

    const { data: sequenceRows, error: sequenceError } = await supabase
      .from('sequences')
      .select('*')
      .eq('campaign_id', params.id)
      .order('step_number', { ascending: true })

    if (sequenceError) return NextResponse.json({ data: null, error: sequenceError.message })

    const schedule = body.campaign_schedule?.schedules?.[0] || {}
    const timezone = normalizeTimezone(schedule.timezone || existingCampaign?.timezone)
    const fromTime = schedule.timing?.from || existingCampaign?.from_time || '09:00'
    const toTime = schedule.timing?.to || existingCampaign?.to_time || '17:00'
    const sendingDays = schedule.days || existingCampaign?.sending_days || { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false }
    const sequenceSteps = Array.isArray(body.sequences) && body.sequences.length > 0 ? body.sequences : sequenceRows || []

    const normalizedSequences: NormalizedSequence[] = sequenceSteps.map((sequence: any, index: number) => ({
      step_number: index + 1,
      delay_days: index === 0 ? 0 : Number(sequence.delay_days ?? index),
      subject_variable: sequence.subject_variable || `{{custom_subject_${index + 1}}}`,
      body_variable: sequence.body_variable || `{{personalization_${index + 1}}}`,
      subject: sequence.subject_variable || `{{custom_subject_${index + 1}}}`,
      body: sequence.body_variable || `{{personalization_${index + 1}}}`
    }))

    const campaignUpdate = {
      organization_id: body.organization_id || body.organizationId || existingCampaign?.organization_id || auth.organizationId || null,
      name: body.name || existingCampaign?.name,
      company_name: campaignOwner.companyName,
      created_from_company: campaignOwner.createdFromCompany,
      daily_limit: Number(body.daily_limit ?? existingCampaign?.daily_limit ?? 50),
      email_gap: Number(body.email_gap ?? existingCampaign?.email_gap ?? 10),
      stop_on_reply: body.stop_on_reply ?? existingCampaign?.stop_on_reply ?? true,
      open_tracking: body.open_tracking ?? existingCampaign?.open_tracking ?? false,
      link_tracking: body.link_tracking ?? existingCampaign?.link_tracking ?? true,
      sending_days: sendingDays,
      timezone,
      from_time: fromTime,
      to_time: toTime,
      target_lead_count: Number(body.target_lead_count ?? existingCampaign?.target_lead_count ?? 0),
      attachment_url: body.attachment_url ?? existingCampaign?.attachment_url ?? null,
      signature: body.signature ?? existingCampaign?.signature ?? null,
      signature_url: body.signature_url ?? body?.sender_info?.signature_url ?? existingCampaign?.signature_url ?? null,
      booking_calendar_link: body.booking_calendar_link ?? body?.sender_info?.booking_calendar_link ?? existingCampaign?.booking_calendar_link ?? null,
      calendly_token: body.calendly_token ?? existingCampaign?.calendly_token ?? null,
      client_email: body.client_email ?? existingCampaign?.client_email ?? null,
      sender_name: body?.sender_info?.name ?? body?.sender_name ?? existingCampaign?.sender_name ?? null,
      sender_company: body?.sender_info?.company ?? body?.sender_company ?? existingCampaign?.sender_company ?? null,
      sender_company_details: body?.sender_info?.company_details ?? body?.sender_company_details ?? existingCampaign?.sender_company_details ?? null,
      long_message: body?.sender_info?.long_message ?? body?.long_message ?? existingCampaign?.long_message ?? null,
      location: body?.sender_info?.location ?? body?.location ?? existingCampaign?.location ?? null,
      sender_address: body?.sender_info?.address ?? body?.sender_address ?? existingCampaign?.sender_address ?? null,
      updated_at: new Date().toISOString()
    }

    if (existingCampaign?.instantly_campaign_id) {
      const instantlyPayload = buildInstantlyPayload({
        ...existingCampaign,
        ...campaignUpdate,
        campaign_schedule: body.campaign_schedule || existingCampaign?.campaign_schedule
      }, normalizedSequences)
      await updateCampaign(existingCampaign.instantly_campaign_id, instantlyPayload)
    }

    const { error: deleteError } = await supabase.from('sequences').delete().eq('campaign_id', params.id)
    if (deleteError) return NextResponse.json({ data: null, error: deleteError.message })

    if (normalizedSequences.length > 0) {
      const { error: insertError } = await supabase.from('sequences').insert(
        normalizedSequences.map((sequence: NormalizedSequence) => ({
          campaign_id: params.id,
          step_number: sequence.step_number,
          delay_days: sequence.delay_days,
          subject_variable: sequence.subject_variable,
          body_variable: sequence.body_variable,
          subject: sequence.subject,
          body: sequence.body
        }))
      )

      if (insertError) return NextResponse.json({ data: null, error: insertError.message })
    }

    const { data, error } = await applyCampaignScope(
      supabase.from('campaigns').update(campaignUpdate).eq('id', params.id),
      auth
    ).select()
    if (error) return NextResponse.json({ data: null, error: error.message })

    const updatedCampaign = data?.[0]
    if (updatedCampaign?.calendly_token && updatedCampaign?.client_email) {
      await supabase
        .from('calendly_tokens')
        .upsert({
          organization_id: auth.organizationId,
          client_email: updatedCampaign.client_email.trim().toLowerCase(),
          calendly_token: updatedCampaign.calendly_token.trim()
        }, { onConflict: 'calendly_token' })
    }

    return NextResponse.json({ data: { ...normalizeCampaignRow(updatedCampaign), sequences: normalizedSequences }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    if (auth.role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Only admins can delete campaigns' }, { status: 403 })
    }

    const { data: existingCampaign, error: existingError } = await applyCampaignScope(
      supabase
        .from('campaigns')
        .select('id, instantly_campaign_id')
        .eq('id', params.id),
      auth
    ).maybeSingle()

    if (existingError) {
      return NextResponse.json({ data: null, error: existingError.message }, { status: 500 })
    }

    if (!existingCampaign) {
      return NextResponse.json({ data: null, error: 'Campaign not found' }, { status: 404 })
    }

    const instantlyCampaignId = existingCampaign?.instantly_campaign_id || null

    if (instantlyCampaignId) {
      try {
        const instantlyDeleteResponse = await deleteInstantlyCampaign(instantlyCampaignId)
        if (!instantlyDeleteResponse) {
          return NextResponse.json({ data: null, error: 'Failed to delete campaign in Instantly.' }, { status: 502 })
        }
      } catch (error: any) {
        if (!isInstantlyNotFoundError(error)) {
          return NextResponse.json(
            { data: null, error: error?.message || 'Failed to delete campaign in Instantly.' },
            { status: 502 }
          )
        }
      }
    }

    // Detach leads instead of deleting them
    const { data: leadsToUpdate, error: leadsFetchError } = await supabase
      .from('leads')
      .select('id, campaign_id, campaign_ids')
      .or(`campaign_id.eq.${params.id},campaign_ids.cs.{${params.id}}`)

    if (leadsFetchError) {
      return NextResponse.json({ data: null, error: leadsFetchError.message }, { status: 500 })
    }

    if (leadsToUpdate && leadsToUpdate.length > 0) {
      const updatePromises = leadsToUpdate.map((lead: any) => {
        const updatedCampaignIds = (lead.campaign_ids || []).filter((id: string) => id !== params.id)
        const updatedCampaignId = lead.campaign_id === params.id ? null : lead.campaign_id
        const isNowEmpty = updatedCampaignIds.length === 0
        
        return supabase
          .from('leads')
          .update({
            campaign_id: updatedCampaignId,
            campaign_ids: updatedCampaignIds,
            ...(isNowEmpty ? { status: 'unassigned' } : {})
          })
          .eq('id', lead.id)
      })

      const results = await Promise.all(updatePromises)
      const firstError = results.find(r => r.error)?.error
      if (firstError) {
        return NextResponse.json({ data: null, error: firstError.message }, { status: 500 })
      }
    }

    const { error: sequencesDeleteError } = await supabase.from('sequences').delete().eq('campaign_id', params.id)
    if (sequencesDeleteError) {
      return NextResponse.json({ data: null, error: sequencesDeleteError.message }, { status: 500 })
    }

    const { data, error } = await applyCampaignScope(
      supabase.from('campaigns').delete().eq('id', params.id),
      auth
    ).select()
    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    }

    if (!data?.[0]) {
      return NextResponse.json({ data: null, error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}
