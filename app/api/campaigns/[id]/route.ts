import { NextResponse } from 'next/server'
import { updateCampaign } from '../../../../lib/instantly/client'
import supabase from '../../../../lib/supabase/server'
import { DEFAULT_TIMEZONE, INSTANTLY_TIMEZONES } from '../../../../lib/timezones'

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
    return NextResponse.json({ data: normalizeCampaignRow(data), error: null })
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

    const updatedCampaign = {
      ...existingCampaign,
      ...body,
      campaign_schedule: body.campaign_schedule || existingCampaign?.campaign_schedule
    }

    if (existingCampaign?.instantly_campaign_id) {
      const instantlyPayload = buildInstantlyPayload(updatedCampaign, sequenceRows || [])
      await updateCampaign(existingCampaign.instantly_campaign_id, instantlyPayload)
    }

    const { data, error } = await supabase.from('campaigns').update(body).eq('id', params.id).select()
    if (error) return NextResponse.json({ data: null, error: error.message })
    return NextResponse.json({ data: normalizeCampaignRow(data?.[0]), error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from('campaigns').delete().eq('id', params.id).select()
    if (error) return NextResponse.json({ data: null, error: error.message })
    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
