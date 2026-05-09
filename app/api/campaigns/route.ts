import { NextResponse } from 'next/server'
import { createCampaign } from '../../../lib/instantly/client'
import supabase from '../../../lib/supabase/server'

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

function normalizeTimezone(timezone: unknown) {
  if (typeof timezone === 'string' && timezone.startsWith('Etc/')) {
    return timezone
  }

  return 'Etc/GMT+12'
}

function formatSchemaError(error: any) {
  if (error?.code === 'PGRST205') {
    return {
      message: "Supabase schema is not installed yet. Run the SQL in supabase/schema.sql to create campaigns, leads, and related tables."
    }
  }

  return error
}

export async function GET() {
  try {
    const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body?.name) {
      return NextResponse.json({ data: null, error: 'Campaign name is required' }, { status: 400 })
    }

    const organizationId = body.organization_id || body.organizationId || null
    const schedule = body.campaign_schedule?.schedules?.[0] || {}

    const instantlyPayload = {
      name: body.name,
      campaign_schedule: {
        schedules: [
          {
            name: schedule.name || 'Default Schedule',
            timezone: normalizeTimezone(schedule.timezone),
            days: mapDays(schedule.days),
            timing: {
              from: schedule.timing?.from || '09:00',
              to: schedule.timing?.to || '17:00'
            }
          }
        ]
      },
      sequences: Array.isArray(body.sequences)
        ? [
            {
              steps: body.sequences.map((sequence: any, index: number) => ({
                type: 'email',
                delay: sequence.delay_days ?? sequence.delay ?? 0,
                delay_unit: 'days',
                variants: [
                  {
                    subject: sequence.subject || sequence.variants?.[0]?.subject || '',
                    body: sequence.body || sequence.variants?.[0]?.body || ''
                  }
                ]
              }))
            }
          ]
        : [],
      email_gap: body.email_gap || 10,
      daily_limit: body.daily_limit || 50,
      stop_on_reply: body.stop_on_reply ?? true,
      open_tracking: body.open_tracking ?? true,
      link_tracking: body.link_tracking ?? true
    }

    const instantlyResponse = await createCampaign(instantlyPayload)
    const instantlyCampaignId =
      instantlyResponse.data?.id ||
      instantlyResponse.data?.campaign?.id ||
      instantlyResponse.data?.data?.id ||
      instantlyResponse.data?.campaign_id ||
      null

    if (!instantlyCampaignId) {
      return NextResponse.json(
        { data: null, error: 'Instantly campaign created, but no campaign id was returned.' },
        { status: 502 }
      )
    }

    const { data, error } = await supabase.from('campaigns').insert([{
      organization_id: organizationId,
      name: body.name,
      status: body.status || 'draft',
      instantly_campaign_id: instantlyCampaignId,
      daily_limit: body.daily_limit || 50,
      email_gap: body.email_gap || 10,
      stop_on_reply: body.stop_on_reply ?? true,
      open_tracking: body.open_tracking ?? true,
      link_tracking: body.link_tracking ?? true,
      timezone: normalizeTimezone(schedule.timezone),
      from_time: schedule.timing?.from || '09:00',
      to_time: schedule.timing?.to || '17:00'
    }]).select()

    if (error) return NextResponse.json({ data: null, error: formatSchemaError(error) })

    const campaign = data?.[0]

    if (campaign?.id && Array.isArray(body.sequences) && body.sequences.length > 0) {
      const sequenceRows = body.sequences.map((sequence: any, index: number) => ({
        campaign_id: campaign.id,
        step_number: sequence.step_number || sequence.stepNumber || index + 1,
        subject: sequence.subject || sequence.variants?.[0]?.subject || '',
        body: sequence.body || sequence.variants?.[0]?.body || '',
        delay_days: sequence.delay_days ?? sequence.delay ?? 0
      }))

      const { error: sequenceError } = await supabase.from('sequences').insert(sequenceRows)
      if (sequenceError) return NextResponse.json({ data: campaign, error: formatSchemaError(sequenceError) })
    }

    return NextResponse.json({ data: campaign, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
