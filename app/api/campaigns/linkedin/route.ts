import { NextResponse } from 'next/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'
import supabase from '../../../../lib/supabase/server'
import { sendLinkedInLeadsToWebhook } from '../../../../lib/webhook/leads'

function normalizeSendingDays(days: unknown) {
  const enabledDays = Array.isArray(days) ? days.map((day) => String(day).toLowerCase()) : []

  return {
    monday: enabledDays.includes('monday'),
    tuesday: enabledDays.includes('tuesday'),
    wednesday: enabledDays.includes('wednesday'),
    thursday: enabledDays.includes('thursday'),
    friday: enabledDays.includes('friday'),
    saturday: enabledDays.includes('saturday'),
    sunday: enabledDays.includes('sunday')
  }
}

function getLinkedInLeadCount(payload: any) {
  if (payload?.lead_source === 'import' && Array.isArray(payload?.leads_csv?.rows)) {
    return payload.leads_csv.rows.length
  }

  return Number(payload?.target_lead_count || 0)
}

function getChannelMetadata(payload: any) {
  return {
    heyreach_account_id: payload?.heyreach_account_id || null,
    heyreach_account: payload?.heyreach_account || null,
    linkedin_profile_url: payload?.linkedin_profile_url || null,
    action_gap_mins: payload?.action_gap_mins ?? null,
    lead_source: payload?.lead_source || null,
    lead_request: payload?.lead_request || null,
    imported_file_name: payload?.leads_csv?.file_name || null,
    imported_row_count: Array.isArray(payload?.leads_csv?.rows) ? payload.leads_csv.rows.length : null
  }
}

async function saveLinkedInCampaign(payload: any, auth: { userId: string; organizationId: string | null }) {
  const nowIso = new Date().toISOString()
  const leadCount = getLinkedInLeadCount(payload)

  const { data, error } = await supabase
    .from('campaigns')
    .insert([{
      organization_id: auth.organizationId || null,
      created_by: auth.userId || null,
      name: payload.campaign_name,
      company_name: payload.company_name || null,
      created_from_company: payload.creator || null,
      status: 'draft',
      upload_status: 'lead_uploading',
      channel: 'linkedin_outreach',
      campaign_type: 'linkedin_outreach',
      channel_metadata: getChannelMetadata(payload),
      instantly_campaign_id: null,
      total_leads: leadCount,
      daily_limit: Number(payload.daily_limit || 50),
      email_gap: Number(payload.action_gap_mins || 10),
      stop_on_reply: payload.stop_on_reply ?? true,
      timezone: payload.timezone || null,
      from_time: payload.from_time || '09:00',
      to_time: payload.to_time || '17:00',
      sending_days: normalizeSendingDays(payload.sending_days),
      target_lead_count: Number(payload.target_lead_count || leadCount || 0),
      report_email: payload.report_email || null,
      booking_calendar_link: payload.booking_calendar_link || null,
      calendly_token: payload.calendly_token || null,
      client_email: payload.client_email || null,
      sender_name: payload.sender_name || null,
      sender_company: payload.company || null,
      sender_company_details: payload.company_details || null,
      location: payload.location || null,
      sender_address: payload.linkedin_profile_url || null,
      created_at: nowIso,
      updated_at: nowIso
    }])
    .select()

  if (error) throw error

  const campaign = data?.[0]
  if (!campaign?.id) {
    throw new Error('LinkedIn campaign was saved, but no campaign id was returned.')
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

  return campaign
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const payload = await req.json()

    if (!payload?.campaign_name) {
      return NextResponse.json({ data: null, error: 'Campaign name is required' }, { status: 400 })
    }

    if (!['linkedin', 'linkedin_outreach'].includes(payload?.channel)) {
      return NextResponse.json({ data: null, error: 'Invalid LinkedIn campaign payload' }, { status: 400 })
    }

    if (!payload?.heyreach_account_id || !/^\d+$/.test(String(payload.heyreach_account_id))) {
      return NextResponse.json({ data: null, error: 'A verified HeyReach account is required' }, { status: 400 })
    }

    const campaign = await saveLinkedInCampaign(payload, auth)

    try {
      await sendLinkedInLeadsToWebhook({
        ...payload,
        campaign_id: campaign.id,
        local_campaign_id: campaign.id,
        supabase_campaign_id: campaign.id,
        supabase_campaign_name: campaign.name || payload.campaign_name,
        campaign_name: campaign.name || payload.campaign_name,
        campaign: {
          id: campaign.id,
          name: campaign.name || payload.campaign_name,
          channel: 'linkedin_outreach',
          campaign_type: 'linkedin_outreach',
          status: campaign.status || 'draft',
          organization_id: campaign.organization_id || auth.organizationId || null
        },
        channel: 'linkedin_outreach',
        campaign_type: 'linkedin_outreach',
        organization_id: auth.organizationId || null,
        created_by: auth.userId || null,
        source: 'linkedin_campaign_launch'
      })
    } catch (webhookError: any) {
      await supabase
        .from('campaigns')
        .update({ status: 'error', upload_status: 'upload_failed', updated_at: new Date().toISOString() })
        .eq('id', campaign.id)

      return NextResponse.json(
        { data: campaign, error: webhookError?.message || String(webhookError) },
        { status: 502 }
      )
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from('campaigns')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', campaign.id)
      .select()

    if (updateError) {
      return NextResponse.json({ data: campaign, error: updateError.message || updateError }, { status: 500 })
    }

    return NextResponse.json({ data: updatedRows?.[0] || campaign, error: null })
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err?.message || String(err) },
      { status: 500 }
    )
  }
}
