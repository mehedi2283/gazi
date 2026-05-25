import { NextResponse } from 'next/server'
import { createCampaign, listAllCampaigns, updateCampaign, listAccounts } from '../../../lib/instantly/client'
import supabase from '../../../lib/supabase/server'
import { sendImportedLeadsToWebhook, sendLeadsToWebhook } from '../../../lib/webhook/leads'
import { DEFAULT_TIMEZONE, INSTANTLY_TIMEZONES } from '../../../lib/timezones'
import { isAuthResponse, requireApiAuth } from '../../../lib/api/auth'

type LocalCampaign = {
  id: string
  organization_id: string | null
  name: string
  company_name: string | null
  created_from_company: string | null
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
  target_lead_count: number | null
  total_booking_count?: number | null
  attachment_url: string | null
  signature: string | null
  signature_url: string | null
  sender_name: string | null
  sender_company: string | null
  sender_company_details: string | null
  long_message: string | null
  location: string | null
  sender_address: string | null
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

type LeadCreationPayload =
  | { mode: 'none' }
  | { mode: 'manual'; lead?: Record<string, any> }
  | { mode: 'apollo'; lead?: Record<string, any> }
  | { mode: 'import'; leads?: Record<string, any>[] }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeRequiredText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getCampaignOwnerFields(body: any) {
  const owner = body?.campaign_owner || {}

  return {
    companyName: normalizeRequiredText(body?.company_name ?? owner.company_name),
    createdFromCompany: normalizeRequiredText(body?.created_from_company ?? owner.created_from_company)
  }
}

async function saveEmailAccount(emailAddress: string, accountName?: string | null) {
  if (!emailAddress) return null

  const { error } = await supabase
    .from('email_accounts')
    .upsert(
      {
        email_address: emailAddress,
        account_name: accountName?.trim() || emailAddress,
        provider: 'instantly',
        synced_at: new Date().toISOString()
      },
      { onConflict: 'email_address' }
    )

  return error ? formatSchemaError(error) : null
}

function formatInstantlyError(error: any) {
  const message = typeof error?.message === 'string'
    ? error.message
    : typeof error?.data?.message === 'string'
      ? error.data.message
      : typeof error?.data?.error === 'string'
        ? error.data.error
        : typeof error === 'string'
          ? error
          : 'Instantly API failed while creating campaign/sequences.'

  if (message.toLowerCase().includes('some emails are not found')) {
    return 'The selected sending email does not exist in your Instantly account.'
  }

  return message
}

function formatCalendarLink(link: string | null | undefined, instantlyCampaignId: string | null) {
  if (!link) return null
  if (!instantlyCampaignId) return link
  try {
    const url = new URL(link)
    url.searchParams.set('utm_campaign', instantlyCampaignId)
    return url.toString()
  } catch (e) {
    const separator = link.includes('?') ? '&' : '?'
    return `${link}${separator}utm_campaign=${encodeURIComponent(instantlyCampaignId)}`
  }
}

function buildWebhookPayload(campaign: any, body: any, instantlyCampaignId: string | null) {
  const senderInfo = body?.sender_info || null
  const sendingEmail = normalizeEmail(body?.sending_email)
  const leadCreation: LeadCreationPayload = body?.lead_creation || { mode: 'none' }
  const sequenceCount = normalizeSequenceSteps(body?.sequences).length

  return {
    source: 'campaign_launch',
    campaign_id: campaign?.id || null,
    campaign_name: campaign?.name || body?.name || null,
    organization_id: campaign?.organization_id || null,
    instantly_campaign_id: instantlyCampaignId,
    sequence_count: sequenceCount,
    calendly_token: body?.calendly_token || campaign?.calendly_token || null,
    client_email: body?.client_email || campaign?.client_email || null,
    sender_info: {
      name: body?.sender_info?.name || campaign?.sender_name || null,
      company: body?.sender_info?.company || campaign?.sender_company || null,
      company_details: body?.sender_info?.company_details || campaign?.sender_company_details || null,
      long_message: body?.sender_info?.long_message || campaign?.long_message || null,
      location: body?.sender_info?.location || campaign?.location || null,
      address: body?.sender_info?.address || body?.sender_info?.sender_address || campaign?.sender_address || null,
      booking_calendar_link: formatCalendarLink(body?.sender_info?.booking_calendar_link || body?.booking_calendar_link || campaign?.booking_calendar_link, instantlyCampaignId),
      attachment_url: body?.attachment_url || body?.sender_info?.attachment_url || campaign?.attachment_url || null,
      signature: body?.signature || body?.sender_info?.signature || campaign?.signature || null,
      signature_url: body?.signature_url || body?.sender_info?.signature_url || campaign?.signature_url || null
    },
    sending_email: sendingEmail || null,
    email_list: sendingEmail ? [sendingEmail] : [],
    lead_creation_mode: leadCreation.mode,
    lead_creation: leadCreation,
    target_lead_count: body?.target_lead_count ?? 0,
    campaign: {
      id: campaign?.id || null,
      name: campaign?.name || body?.name || null,
      status: campaign?.status || null,
      daily_limit: campaign?.daily_limit ?? null,
      email_gap: campaign?.email_gap ?? null,
      stop_on_reply: campaign?.stop_on_reply ?? null,
      open_tracking: campaign?.open_tracking ?? null,
      link_tracking: campaign?.link_tracking ?? null,
      timezone: campaign?.timezone || null,
      from_time: campaign?.from_time || null,
      to_time: campaign?.to_time || null,
      sending_email: sendingEmail || null
    }
  }
}

function mapDays(days: any) {
  if (Array.isArray(days)) {
    // If it's an array, assume it's ordered from monday to sunday
    const [monday, tuesday, wednesday, thursday, friday, saturday, sunday] = days
    return {
      "0": Boolean(monday),
      "1": Boolean(tuesday),
      "2": Boolean(wednesday),
      "3": Boolean(thursday),
      "4": Boolean(friday),
      "5": Boolean(saturday),
      "6": Boolean(sunday)
    }
  }

  return {
    "0": Boolean(days?.monday),
    "1": Boolean(days?.tuesday),
    "2": Boolean(days?.wednesday),
    "3": Boolean(days?.thursday),
    "4": Boolean(days?.friday),
    "5": Boolean(days?.saturday),
    "6": Boolean(days?.sunday)
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

function sortCampaignsByCreatedAt(campaigns: LocalCampaign[]) {
  return [...campaigns].sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0

    if (rightTime !== leftTime) {
      return rightTime - leftTime
    }

    return String(right.id || '').localeCompare(String(left.id || ''))
  })
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

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(Math.floor(parsed), max)
}

function applyCampaignScope(query: any, auth: { userId: string; organizationId: string | null }) {
  if (auth.organizationId) {
    return query.eq('organization_id', auth.organizationId)
  }

  return query.eq('created_by', auth.userId)
}

function applyLeadScope(query: any, auth: { userId: string; organizationId: string | null }) {
  if (auth.organizationId) {
    return query.eq('organization_id', auth.organizationId)
  }

  return query
}

async function fetchCampaignLeadCount(campaignId: string, auth: { userId: string; organizationId: string | null }) {
  let query = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .or(`campaign_id.eq.${campaignId},campaign_ids.cs.{${campaignId}}`)

  query = applyLeadScope(query, auth)

  const { count, error } = await query
  if (error) throw error

  return count ?? 0
}

async function attachCampaignLeadCounts(campaigns: LocalCampaign[], auth: { userId: string; organizationId: string | null }) {
  return Promise.all(
    campaigns.map(async (campaign) => ({
      ...campaign,
      total_leads: await fetchCampaignLeadCount(campaign.id, auth)
    }))
  )
}

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const { searchParams } = new URL(req.url)
    const page = parsePositiveInt(searchParams.get('page'), 1, 100000)
    const perPage = parsePositiveInt(searchParams.get('per_page'), 25, 100)
    const shouldSyncInstantly = searchParams.get('sync') === '1'
    const search = (searchParams.get('q') || '').trim()
    const selectedDate = (searchParams.get('date') || '').trim()
    const startDate = (searchParams.get('startDate') || '').trim()
    const endDate = (searchParams.get('endDate') || '').trim()
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    let query = applyCampaignScope(
      supabase
        .from('campaigns')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false }),
      auth
    )

    if (search) {
      const escaped = search.replace(/[%_]/g, '\\$&')
      query = query.or(`name.ilike.%${escaped}%,status.ilike.%${escaped}%,instantly_campaign_id.ilike.%${escaped}%`)
    }

    if (startDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`).toISOString()
      query = query.gte('created_at', start)
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999Z`).toISOString()
      query = query.lte('created_at', end)
    }
    if (!startDate && !endDate && selectedDate) {
      const start = new Date(`${selectedDate}T00:00:00.000Z`).toISOString()
      const end = new Date(`${selectedDate}T23:59:59.999Z`).toISOString()
      query = query.gte('created_at', start).lte('created_at', end)
    }

    const { data, error, count } = await query.range(from, to)

    if (error) return NextResponse.json({ data: null, error: formatSchemaError(error) })

    let localCampaigns = (data || []).map((c: any) => ({
      ...c,
      total_leads: c.total_leads ?? 0
    })) as LocalCampaign[]

    if (shouldSyncInstantly && process.env.INSTANTLY_API_KEY) {
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

      const statusUpdates = mergedInstantlyCampaigns
        .map((merged) => {
          const local = latestLocalByInstantlyId.get(merged.instantly_campaign_id!)
          if (local && local.status !== merged.status) {
            return { id: merged.id, status: merged.status }
          }
          return null
        })
        .filter(Boolean)

      if (statusUpdates.length > 0) {
        await Promise.all(
          statusUpdates.map((update) =>
            supabase
              .from('campaigns')
              .update({ status: update!.status, updated_at: new Date().toISOString() })
              .eq('id', update!.id)
          )
        )
      }

      const campaignsForResponse = await attachCampaignLeadCounts([...mergedInstantlyCampaigns, ...localOnlyCampaigns], auth)

      return NextResponse.json({
        data: sortCampaignsByCreatedAt(campaignsForResponse),
        error: null,
        meta: { page, perPage, total: count ?? localCampaigns.length }
      })
    }

    const campaignsForResponse = await attachCampaignLeadCounts(
      localCampaigns.map((campaign) => ({
        ...campaign,
        status: normalizeCampaignStatus(campaign.status)
      })),
      auth
    )

    return NextResponse.json({
      data: sortCampaignsByCreatedAt(campaignsForResponse),
      error: null,
      meta: { page, perPage, total: count ?? localCampaigns.length }
    })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const campaignOwner = getCampaignOwnerFields(body)

    if (!body?.name) {
      return NextResponse.json({ data: null, error: 'Campaign name is required' }, { status: 400 })
    }

    if (!campaignOwner.companyName || !campaignOwner.createdFromCompany) {
      return NextResponse.json({ data: null, error: 'Campaign owner details are required' }, { status: 400 })
    }

    const organizationId = body.organization_id || body.organizationId || auth.organizationId || null
    const createdBy = auth.userId
    const sendingEmail = normalizeEmail(body.sending_email)
    const schedule = body.campaign_schedule?.schedules?.[0] || {}
    const sequenceSteps = normalizeSequenceSteps(body.sequences)
    const sequenceError = validateSequenceSteps(sequenceSteps)

    if (body.sending_email && !EMAIL_REGEX.test(sendingEmail)) {
      return NextResponse.json({ data: null, error: 'Please enter a valid sending email address' }, { status: 400 })
    }

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
      company_name: campaignOwner.companyName,
      created_from_company: campaignOwner.createdFromCompany,
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
      target_lead_count: Number(body.target_lead_count ?? 0),
      report_email: body.report_email || null,
      booking_calendar_link: body?.sender_info?.booking_calendar_link || body.booking_calendar_link || null,
      attachment_url: body.attachment_url || body?.sender_info?.attachment_url || null,
      signature: body.signature || body?.sender_info?.signature || null,
      signature_url: body.signature_url || body?.sender_info?.signature_url || null,
      calendly_token: body.calendly_token || null,
      client_email: body.client_email || null,
      sender_name: body?.sender_info?.name || body?.sender_name || null,
      sender_company: body?.sender_info?.company || body?.sender_company || null,
      sender_company_details: body?.sender_info?.company_details || body?.sender_company_details || null,
      long_message: body?.sender_info?.long_message || body?.long_message || null,
      location: body?.sender_info?.location || body?.location || null,
      sender_address: body?.sender_info?.address || body?.sender_address || null,
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

    if (campaign.calendly_token && campaign.client_email) {
      await supabase
        .from('calendly_tokens')
        .upsert({
          organization_id: auth.organizationId,
          client_email: campaign.client_email.trim().toLowerCase(),
          calendly_token: campaign.calendly_token.trim()
        }, { onConflict: 'calendly_token' })
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

    // Validate selected sending email exists in Instantly account
    if (sendingEmail) {
      try {
        const accountsRes = await listAccounts()
        let accounts: any[] = []

        if (Array.isArray(accountsRes?.data)) {
          accounts = accountsRes.data
        } else if (Array.isArray(accountsRes?.data?.items)) {
          accounts = accountsRes.data.items
        } else if (Array.isArray(accountsRes?.items)) {
          accounts = accountsRes.items
        }

        const found = accounts.find((a: any) => String((a.email || a.email_address || '')).toLowerCase() === sendingEmail)
        if (!found) {
          return NextResponse.json({ data: null, error: `The sending email ${sendingEmail} is not present in your Instantly account. Please add it there or sync accounts.` }, { status: 400 })
        }
      } catch (err) {
        // If listing accounts fails, continue and let Instantly return the error on create
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
      link_tracking: linkTracking,
      ...(sendingEmail ? { email_list: [sendingEmail] } : {})
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
            steps: sequenceSteps.map((sequence, index, arr) => {
              // Instantly expects the delay on Step N to be the wait time before Step N+1.
              // We calculate the relative delay from the absolute delay_days we store.
              let relativeDelay = 0;
              if (index < arr.length - 1) {
                relativeDelay = arr[index + 1].delay_days - sequence.delay_days;
              }

              return {
                type: 'email',
                delay: relativeDelay,
                delay_unit: 'days',
                variants: [
                  {
                    subject: sequence.subject_variable,
                    body: sequence.body_variable
                  }
                ]
              };
            })
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
            booking_calendar_link: body?.sender_info?.booking_calendar_link || body.booking_calendar_link || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)
        .select()

      if (updateError) {
        return NextResponse.json({ data: campaign, error: formatSchemaError(updateError) }, { status: 500 })
      }

      const updatedCampaign = updatedRows?.[0] || { ...campaign, instantly_campaign_id: instantlyCampaignId, status: instantlyStatus }

      if (sendingEmail) {
        const emailAccountError = await saveEmailAccount(sendingEmail, body?.sending_email_account_name || null)

        if (emailAccountError) {
          return NextResponse.json({ data: updatedCampaign, error: emailAccountError }, { status: 500 })
        }
      }

      const webhookErrors: string[] = []

      if (body?.lead_creation?.mode === 'apollo') {
        try {
          const webhookPayload = buildWebhookPayload(updatedCampaign, body, instantlyCampaignId)
          await sendLeadsToWebhook(webhookPayload)
        } catch (error: any) {
          webhookErrors.push(error?.message || String(error))
        }
      }

      if (body?.lead_creation?.mode === 'import' && Array.isArray(body?.lead_creation?.leads)) {
        try {
          const sequenceCount = Array.isArray(body?.sequences) ? body.sequences.length : 0
          await sendImportedLeadsToWebhook(
            body.lead_creation.leads,
            updatedCampaign?.name || body?.name || '',
            updatedCampaign?.id || campaign.id,
            {
              sender_info: {
                name: body?.sender_info?.name || updatedCampaign?.sender_name || null,
                company: body?.sender_info?.company || updatedCampaign?.sender_company || null,
                company_details: body?.sender_info?.company_details || updatedCampaign?.sender_company_details || null,
                long_message: body?.sender_info?.long_message || updatedCampaign?.long_message || null,
                location: body?.sender_info?.location || updatedCampaign?.location || null,
                address: body?.sender_info?.address || body?.sender_info?.sender_address || updatedCampaign?.sender_address || null,
                booking_calendar_link: formatCalendarLink(body?.sender_info?.booking_calendar_link || body?.booking_calendar_link || updatedCampaign?.booking_calendar_link, instantlyCampaignId),
                attachment_url: body?.attachment_url || body?.sender_info?.attachment_url || updatedCampaign?.attachment_url || null,
                signature: body?.signature || body?.sender_info?.signature || updatedCampaign?.signature || null,
                signature_url: body?.signature_url || body?.sender_info?.signature_url || updatedCampaign?.signature_url || null
              },
              sending_email: sendingEmail || null,
              instantly_campaign_id: instantlyCampaignId,
              sequence_count: sequenceCount,
              target_lead_count: Number(body.target_lead_count ?? 0),
              attachment_url: body.attachment_url || null,
              signature: body.signature || null,
              calendly_token: body?.calendly_token || null,
              client_email: body?.client_email || null
            }
          )
        } catch (error: any) {
          webhookErrors.push(error?.message || String(error))
        }
      }

      const webhookError = webhookErrors.length > 0 ? webhookErrors.join(' | ') : null

      return NextResponse.json({ data: updatedCampaign, error: null, webhookError })
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
        error: formatInstantlyError(instantlyError)
      }, { status: 502 })
    }
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
