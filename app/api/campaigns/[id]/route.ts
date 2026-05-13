import { NextResponse } from 'next/server'
import { deleteCampaign as deleteInstantlyCampaign, updateCampaign } from '../../../../lib/instantly/client'
import supabase from '../../../../lib/supabase/server'
import { DEFAULT_TIMEZONE, INSTANTLY_TIMEZONES } from '../../../../lib/timezones'

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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from('campaigns').select('*').eq('id', params.id).single()
    if (error) return NextResponse.json({ data: null, error: error.message })

    const { data: sequences, error: sequenceError } = await supabase
      .from('sequences')
      .select('*')
      .eq('campaign_id', params.id)
      .order('step_number', { ascending: true })

    if (sequenceError) return NextResponse.json({ data: null, error: sequenceError.message })

    return NextResponse.json({ data: { ...normalizeCampaignRow(data), sequences: sequences || [] }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()

    const { data: existingCampaign, error: existingError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', params.id)
      .single()

    if (existingError) return NextResponse.json({ data: null, error: existingError.message })

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
      organization_id: body.organization_id || body.organizationId || existingCampaign?.organization_id || null,
      name: body.name || existingCampaign?.name,
      daily_limit: Number(body.daily_limit ?? existingCampaign?.daily_limit ?? 50),
      email_gap: Number(body.email_gap ?? existingCampaign?.email_gap ?? 10),
      stop_on_reply: body.stop_on_reply ?? existingCampaign?.stop_on_reply ?? true,
      open_tracking: body.open_tracking ?? existingCampaign?.open_tracking ?? false,
      link_tracking: body.link_tracking ?? existingCampaign?.link_tracking ?? true,
      sending_days: sendingDays,
      timezone,
      from_time: fromTime,
      to_time: toTime,
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

    const { data, error } = await supabase.from('campaigns').update(campaignUpdate).eq('id', params.id).select()
    if (error) return NextResponse.json({ data: null, error: error.message })
    return NextResponse.json({ data: { ...normalizeCampaignRow(data?.[0]), sequences: normalizedSequences }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data: existingCampaign, error: existingError } = await supabase
      .from('campaigns')
      .select('id, instantly_campaign_id')
      .eq('id', params.id)
      .single()

    if (existingError) return NextResponse.json({ data: null, error: existingError.message })

    const instantlyCampaignId = existingCampaign?.instantly_campaign_id || null

    if (instantlyCampaignId) {
      const instantlyDeleteResponse = await deleteInstantlyCampaign(instantlyCampaignId)
      if (!instantlyDeleteResponse) {
        return NextResponse.json({ data: null, error: 'Failed to delete campaign in Instantly.' }, { status: 500 })
      }
    }

    const { error: leadsDeleteError } = await supabase.from('leads').delete().eq('campaign_id', params.id)
    if (leadsDeleteError) return NextResponse.json({ data: null, error: leadsDeleteError.message })

    const { error: sequencesDeleteError } = await supabase.from('sequences').delete().eq('campaign_id', params.id)
    if (sequencesDeleteError) return NextResponse.json({ data: null, error: sequencesDeleteError.message })

    const { data, error } = await supabase.from('campaigns').delete().eq('id', params.id).select()
    if (error) return NextResponse.json({ data: null, error: error.message })
    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
