import { NextResponse } from 'next/server'
import { createCampaign, listAllCampaigns, updateCampaign } from '../../../lib/instantly/client'
import supabase from '../../../lib/supabase/server'
import { DEFAULT_TIMEZONE, INSTANTLY_TIMEZONES } from '../../../lib/timezones'

type LocalCampaign = {
  id: string
  organization_id: string | null
  name: string
  status: string | null
  instantly_campaign_id: string | null
  daily_limit: number | null
  email_gap: number | null
  stop_on_reply: boolean | null
  open_tracking: boolean | null
  link_tracking: boolean | null
  sending_days: Record<string, boolean> | null
  timezone: string | null
  from_time: string | null
  to_time: string | null
  created_at: string | null
  updated_at: string | null
}

type SequenceStepInput = {
  delay_days?: unknown
  delay?: unknown
}

type NormalizedSequenceStep = {
  step_number: number
  delay_days: number
  subject_variable: string
  body_variable: string
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

function getSubjectVariable(stepNumber: number) {
  return `{{custom_subject_${stepNumber}}}`
}

function getBodyVariable(stepNumber: number) {
  return `{{personalization_${stepNumber}}}`
}

function normalizeSequenceSteps(sequences: unknown): NormalizedSequenceStep[] {
  const rawSteps = Array.isArray(sequences) && sequences.length > 0 ? sequences : [{ delay_days: 0 }]

  return rawSteps.map((sequence: SequenceStepInput, index: number) => {
    const stepNumber = index + 1
    const rawDelay = index === 0 ? 0 : sequence?.delay_days ?? sequence?.delay ?? 0
    const delayDays = Number(rawDelay)

    return {
      step_number: stepNumber,
      delay_days: index === 0 ? 0 : delayDays,
      subject_variable: getSubjectVariable(stepNumber),
      body_variable: getBodyVariable(stepNumber)
    }
  })
}

function validateSequenceSteps(steps: NormalizedSequenceStep[]) {
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]

    if (!Number.isFinite(step.delay_days) || step.delay_days < 0) {
      return `Step ${step.step_number} delay_days must be 0 or greater.`
    }

    if (index === 0 && step.delay_days !== 0) {
      return 'Step 1 delay_days must be 0.'
    }

    if (index > 0 && step.delay_days <= steps[index - 1].delay_days) {
      return `Step ${step.step_number} delay_days must be greater than Step ${steps[index - 1].step_number}.`
    }
  }

  return ''
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

function normalizeCampaignStatus(status: unknown) {
  const value = String(status || 'draft')
  if (['draft', 'active', 'paused', 'completed', 'error', 'account_suspended', 'accounts_unhealthy', 'bounce_protect', 'running_subsequences'].includes(value)) {
    return value
  }

  return mapInstantlyStatus(status)
}

function normalizeInstantlyCampaign(campaign: any) {
  const schedule = campaign?.campaign_schedule?.schedules?.[0] || {}
  const timing = schedule?.timing || {}

  return {
    organization_id: null,
    name: campaign?.name || 'Untitled campaign',
    status: mapInstantlyStatus(campaign?.status),
    instantly_campaign_id: campaign?.id,
    daily_limit: campaign?.daily_limit ?? 50,
    email_gap: campaign?.email_gap ?? 10,
    stop_on_reply: campaign?.stop_on_reply ?? true,
    open_tracking: campaign?.open_tracking ?? true,
    link_tracking: campaign?.link_tracking ?? true,
    sending_days: schedule?.days || { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
    timezone: normalizeTimezone(schedule?.timezone),
    from_time: timing?.from || '09:00',
    to_time: timing?.to || '17:00',
    created_at: campaign?.timestamp_created || undefined,
    updated_at: campaign?.timestamp_updated || undefined
  }
}

function mergeInstantlyCampaign(local: LocalCampaign, instantlyCampaign: any): LocalCampaign {
  const normalized = normalizeInstantlyCampaign(instantlyCampaign)

  return {
    ...local,
    name: normalized.name,
    status: normalizeCampaignStatus(normalized.status),
    instantly_campaign_id: normalized.instantly_campaign_id,
    daily_limit: normalized.daily_limit,
    email_gap: normalized.email_gap,
    stop_on_reply: normalized.stop_on_reply,
    open_tracking: normalized.open_tracking,
    link_tracking: normalized.link_tracking,
    sending_days: normalized.sending_days,
    timezone: normalized.timezone,
    from_time: normalized.from_time,
    to_time: normalized.to_time,
    created_at: local.created_at || normalized.created_at || null,
    updated_at: normalized.updated_at || local.updated_at || null
  }
}

function normalizeTimezone(timezone: unknown) {
  if (typeof timezone === 'string' && (INSTANTLY_TIMEZONES as readonly string[]).includes(timezone)) {
    return timezone
  }

  return DEFAULT_TIMEZONE
}

function formatSchemaError(error: any) {
  if (error?.code === 'PGRST205') {
    return {
      message: "Supabase schema is not installed yet. Run the SQL in supabase/schema.sql to create campaigns, leads, and related tables."
    }
  }

  if (
    typeof error?.message === 'string' &&
    (error.message.includes('subject_variable') || error.message.includes('body_variable'))
  ) {
    return {
      message: "Supabase sequences table is missing subject_variable/body_variable columns. Run the updated SQL in supabase/schema.sql before launching campaigns."
    }
  }

  if (
    typeof error?.message === 'string' &&
    (
      error.message.includes('created_by') ||
      error.message.includes('total_leads') ||
      error.message.includes('open_count') ||
      error.message.includes('reply_count') ||
      error.message.includes('bounce_count')
    )
  ) {
    return {
      message: 'Supabase campaigns table is missing tracking columns. Run the latest migration in supabase/migrations before launching campaigns.'
    }
  }

  return error
}

async function ensureSequenceVariableColumns() {
  const { error } = await supabase
    .from('sequences')
    .select('subject_variable, body_variable')
    .limit(1)

  return error ? formatSchemaError(error) : null
}

export async function GET() {
  try {
    const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ data: null, error })

    let localCampaigns = (data || []) as LocalCampaign[]

    if (process.env.INSTANTLY_API_KEY) {
      const instantlyCampaigns = await listAllCampaigns()
      const localByInstantlyId = new Map(
        localCampaigns
          .filter((campaign) => campaign.instantly_campaign_id)
          .map((campaign) => [campaign.instantly_campaign_id, campaign])
      )
      const missingRows = instantlyCampaigns
        .filter((campaign) => campaign?.id && !localByInstantlyId.has(campaign.id))
        .map(normalizeInstantlyCampaign)

      if (missingRows.length) {
        const { data: inserted, error: insertError } = await supabase
          .from('campaigns')
          .insert(missingRows)
          .select()

        if (insertError) return NextResponse.json({ data: null, error: formatSchemaError(insertError) })
        localCampaigns = [...((inserted || []) as LocalCampaign[]), ...localCampaigns]
      }

      const latestLocalByInstantlyId = new Map(
        localCampaigns
          .filter((campaign) => campaign.instantly_campaign_id)
          .map((campaign) => [campaign.instantly_campaign_id, campaign])
      )
      const mergedInstantlyCampaigns = instantlyCampaigns
        .map((campaign) => {
          const local = latestLocalByInstantlyId.get(campaign.id)
          return local ? mergeInstantlyCampaign(local, campaign) : null
        })
        .filter(Boolean) as LocalCampaign[]
      const instantlyIds = new Set(mergedInstantlyCampaigns.map((campaign) => campaign.instantly_campaign_id))
      const localOnlyCampaigns = localCampaigns.filter((campaign) => !campaign.instantly_campaign_id || !instantlyIds.has(campaign.instantly_campaign_id))

      return NextResponse.json({ data: [...mergedInstantlyCampaigns, ...localOnlyCampaigns], error: null })
    }

    return NextResponse.json({
      data: localCampaigns.map((campaign) => ({
        ...campaign,
        status: normalizeCampaignStatus(campaign.status)
      })),
      error: null
    })
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
    const createdBy = body.created_by || body.createdBy || req.headers.get('x-user-id') || null
    const schedule = body.campaign_schedule?.schedules?.[0] || {}
    const sequenceSteps = normalizeSequenceSteps(body.sequences)
    const sequenceError = validateSequenceSteps(sequenceSteps)

    if (sequenceError) {
      return NextResponse.json({ data: null, error: sequenceError }, { status: 400 })
    }

    const sequenceSchemaError = await ensureSequenceVariableColumns()

    if (sequenceSchemaError) {
      return NextResponse.json({ data: null, error: sequenceSchemaError }, { status: 500 })
    }

    const dailyLimit = Number(body.daily_limit ?? 50)
    const emailGap = Number(body.email_gap ?? 10)
    const stopOnReply = body.stop_on_reply ?? true
    const openTracking = body.open_tracking ?? false
    const linkTracking = body.link_tracking ?? true
    const sendingDays = schedule.days || { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false }
    const timezone = normalizeTimezone(schedule.timezone)
    const fromTime = schedule.timing?.from || '09:00'
    const toTime = schedule.timing?.to || '17:00'

    const nowIso = new Date().toISOString()

    const { data: campaignRows, error: campaignInsertError } = await supabase.from('campaigns').insert([{
      organization_id: organizationId,
      name: body.name,
      status: 'draft',
      instantly_campaign_id: null,
      daily_limit: Number.isFinite(dailyLimit) ? dailyLimit : 50,
      email_gap: Number.isFinite(emailGap) ? emailGap : 10,
      stop_on_reply: stopOnReply,
      open_tracking: openTracking,
      link_tracking: linkTracking,
      sending_days: sendingDays,
      timezone,
      from_time: fromTime,
      to_time: toTime,
      created_by: createdBy,
      total_leads: 0,
      emails_sent: 0,
      open_count: 0,
      reply_count: 0,
      bounce_count: 0,
      created_at: nowIso,
      updated_at: nowIso
    }]).select()

    if (campaignInsertError) {
      return NextResponse.json({ data: null, error: formatSchemaError(campaignInsertError) })
    }

    const campaign = campaignRows?.[0]

    if (!campaign?.id) {
      return NextResponse.json({ data: null, error: 'Campaign was saved, but no local campaign id was returned.' }, { status: 500 })
    }

    if (campaign?.id && sequenceSteps.length > 0) {
      const sequenceRows = sequenceSteps.map((sequence) => ({
        campaign_id: campaign.id,
        step_number: sequence.step_number,
        delay_days: sequence.delay_days,
        subject_variable: sequence.subject_variable,
        body_variable: sequence.body_variable,
        subject: sequence.subject_variable,
        body: sequence.body_variable
      }))

      const { error: sequenceError } = await supabase.from('sequences').insert(sequenceRows)
      if (sequenceError) {
        await supabase
          .from('campaigns')
          .update({ status: 'error', updated_at: new Date().toISOString() })
          .eq('id', campaign.id)

        return NextResponse.json({ data: campaign, error: formatSchemaError(sequenceError) }, { status: 500 })
      }
    }

    const instantlySettingsPayload = {
      name: body.name,
      campaign_schedule: {
        schedules: [
          {
            name: schedule.name || 'Default Schedule',
            timezone,
            days: mapDays(schedule.days),
            timing: {
              from: fromTime,
              to: toTime
            }
          }
        ]
      },
      email_gap: Number.isFinite(emailGap) ? emailGap : 10,
      daily_limit: Number.isFinite(dailyLimit) ? dailyLimit : 50,
      stop_on_reply: stopOnReply,
      open_tracking: openTracking,
      link_tracking: linkTracking
    }

    let instantlyCampaignId: string | null = null

    try {
      const instantlyCampaignResponse = await createCampaign(instantlySettingsPayload)
      instantlyCampaignId =
        instantlyCampaignResponse.data?.id ||
        instantlyCampaignResponse.data?.campaign?.id ||
        instantlyCampaignResponse.data?.data?.id ||
        instantlyCampaignResponse.data?.campaign_id ||
        null

      if (!instantlyCampaignId) {
        throw new Error('Instantly campaign created, but no campaign id was returned.')
      }

      const { error: saveInstantlyIdError } = await supabase
        .from('campaigns')
        .update({
          instantly_campaign_id: instantlyCampaignId,
          sending_days: sendingDays,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)

      if (saveInstantlyIdError) {
        return NextResponse.json({ data: campaign, error: formatSchemaError(saveInstantlyIdError) }, { status: 500 })
      }

      const instantlySequencePayload = {
        sequences: [
          {
            steps: sequenceSteps.map((sequence) => ({
              type: 'email',
              delay: sequence.delay_days,
              delay_unit: 'days',
              variants: [
                {
                  subject: sequence.subject_variable,
                  body: sequence.body_variable
                }
              ]
            }))
          }
        ]
      }

      if (sequenceSteps.length > 0) {
        await updateCampaign(instantlyCampaignId, instantlySequencePayload)
      }

      const instantlyStatus = instantlyCampaignResponse?.data?.status !== undefined
        ? mapInstantlyStatus(instantlyCampaignResponse.data.status)
        : 'draft'

      const { data: updatedRows, error: updateError } = await supabase
        .from('campaigns')
        .update({
          instantly_campaign_id: instantlyCampaignId,
          sending_days: sendingDays,
          status: instantlyStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)
        .select()

      if (updateError) {
        return NextResponse.json({ data: campaign, error: formatSchemaError(updateError) }, { status: 500 })
      }

      return NextResponse.json({ data: updatedRows?.[0] || { ...campaign, instantly_campaign_id: instantlyCampaignId, status: instantlyStatus }, error: null })
    } catch (instantlyError: any) {
      await supabase
        .from('campaigns')
        .update({
          status: 'error',
          instantly_campaign_id: instantlyCampaignId,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)

      return NextResponse.json({
        data: campaign,
        error: instantlyError?.message || 'Instantly API failed while creating campaign/sequences.'
      }, { status: 502 })
    }
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
