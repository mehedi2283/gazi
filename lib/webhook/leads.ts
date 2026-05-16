const DEFAULT_LEAD_WEBHOOK_URL = 'https://gaziai.app.n8n.cloud/webhook/88e7c5d9-6015-4ade-86af-03fc2b7b1c90'
const LEAD_WEBHOOK_URL = process.env.LEADS_WEBHOOK_URL || DEFAULT_LEAD_WEBHOOK_URL
const IMPORT_WEBHOOK_URL = 'https://gaziai.app.n8n.cloud/webhook/22d3c430-9fa6-4c17-893b-a2e2a6d4e090'

type LeadPayload = {
  campaign_id?: string | null
  [key: string]: any
}

type CampaignWebhookMeta = {
  instantly_campaign_id: string | null
  sequence_count: number
}

export async function sendLeadsToWebhook(payload: unknown) {
  const response = await fetch(LEAD_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const responseText = await response.text().catch(() => '')
    throw new Error(
      `Webhook request failed with status ${response.status}${responseText ? `: ${responseText}` : ''}`
    )
  }

  return response
}

export async function sendImportedLeadsToWebhook(
  leads: LeadPayload[],
  campaignName: string,
  campaignId: string,
  options: {
    sender_info?: Record<string, any> | null
    sending_email?: string | null
    instantly_campaign_id?: string | null
    sequence_count?: number
    target_lead_count?: number | null
    attachment_url?: string | null
    signature?: string | null
  } = {}
) {
  const payload = {
    source: 'lead_import',
    campaign_id: campaignId,
    campaign_name: campaignName,
    sender_info: options.sender_info || null,
    sending_email: options.sending_email || null,
    email_list: options.sending_email ? [options.sending_email] : [],
    instantly_campaign_id: options.instantly_campaign_id || null,
    sequence_count: options.sequence_count ?? 0,
    target_lead_count: options.target_lead_count ?? 0,
    attachment_url: options.attachment_url || null,
    signature: options.signature || null,
    total_leads: leads.length,
    leads: leads
  }

  const response = await fetch(IMPORT_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const responseText = await response.text().catch(() => '')
    console.error(`Import webhook request failed: ${response.status}${responseText ? `: ${responseText}` : ''}`)
  }

  return response
}

export function mapLeadsForWebhook(
  leads: LeadPayload[],
  campaignMetaByLocalId: Map<string, CampaignWebhookMeta>
) {
  return leads.map((lead) => {
    const localCampaignId = lead.campaign_id ? String(lead.campaign_id) : null
    const campaignMeta = localCampaignId ? campaignMetaByLocalId.get(localCampaignId) : null
    const instantlyCampaignId = campaignMeta?.instantly_campaign_id || null
    const sequenceCount = campaignMeta?.sequence_count ?? 0

    return {
      ...lead,
      local_campaign_id: localCampaignId,
      instantly_campaign_id: instantlyCampaignId,
      sequence_count: sequenceCount,
      campaign_id: instantlyCampaignId || localCampaignId
    }
  })
}
