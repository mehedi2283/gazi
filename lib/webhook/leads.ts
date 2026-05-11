const DEFAULT_LEAD_WEBHOOK_URL = 'https://gaziai.app.n8n.cloud/webhook/22d3c430-9fa6-4c17-893b-a2e2a6d4e090'
const LEAD_WEBHOOK_URL = process.env.LEADS_WEBHOOK_URL || DEFAULT_LEAD_WEBHOOK_URL

const DEFAULT_MANUAL_LEAD_WEBHOOK_URL = 'https://gaziai.app.n8n.cloud/webhook/88e7c5d9-6015-4ade-86af-03fc2b7b1c90'
const MANUAL_LEAD_WEBHOOK_URL = process.env.MANUAL_LEADS_WEBHOOK_URL || DEFAULT_MANUAL_LEAD_WEBHOOK_URL

type LeadPayload = {
  campaign_id?: string | null
  [key: string]: any
}

type CampaignWebhookMeta = {
  instantly_campaign_id: string | null
  sequence_count: number
}

export async function sendLeadsToWebhook(payload: unknown) {
  let bodyPayload: unknown

  if (Array.isArray(payload)) {
    bodyPayload = { leads: payload, contacts_count: payload.length }
  } else if (payload && typeof payload === 'object') {
    const p: any = payload as any
    bodyPayload = { ...p, contacts_count: p.contacts_count ?? 1 }
  } else {
    bodyPayload = { data: payload, contacts_count: 0 }
  }

  const response = await fetch(LEAD_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyPayload)
  })

  if (!response.ok) {
    throw new Error(`Webhook request failed with status ${response.status}`)
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

export async function sendManualLeadsToWebhook(payload: unknown) {
  let bodyPayload: unknown

  if (Array.isArray(payload)) {
    bodyPayload = { leads: payload, contacts_count: payload.length }
  } else if (payload && typeof payload === 'object') {
    const p: any = payload as any
    bodyPayload = { ...p, contacts_count: p.contacts_count ?? 1 }
  } else {
    bodyPayload = { data: payload, contacts_count: 0 }
  }

  const response = await fetch(MANUAL_LEAD_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyPayload)
  })

  if (!response.ok) {
    throw new Error(`Webhook request failed with status ${response.status}`)
  }

  return response
}