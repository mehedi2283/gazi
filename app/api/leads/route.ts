import { NextResponse } from 'next/server'
import supabase from '../../../lib/supabase/server'
import { mapLeadsForWebhook, sendManualLeadsToWebhook } from '../../../lib/webhook/leads'

export async function GET() {
  try {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { data, error } = await supabase.from('leads').insert([body]).select()
    if (error) return NextResponse.json({ data: null, error })

    const savedLead = data?.[0] || body
    const localCampaignId = savedLead?.campaign_id ? String(savedLead.campaign_id) : null
    const campaignMetaByLocalId = new Map<string, { instantly_campaign_id: string | null, sequence_count: number }>()

    if (localCampaignId) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('id, instantly_campaign_id')
        .eq('id', localCampaignId)
        .single()

      const { data: sequences } = await supabase
        .from('sequences')
        .select('id')
        .eq('campaign_id', localCampaignId)

      if (campaign?.id) {
        campaignMetaByLocalId.set(String(campaign.id), {
          instantly_campaign_id: campaign?.instantly_campaign_id ? String(campaign.instantly_campaign_id) : null,
          sequence_count: sequences?.length || 0
        })
      }
    }

    const webhookPayload = mapLeadsForWebhook([savedLead], campaignMetaByLocalId)[0]

    let webhookError: string | null = null
    try {
      await sendManualLeadsToWebhook(webhookPayload)
    } catch (e) {
      webhookError = e instanceof Error ? e.message : String(e)
    }

    return NextResponse.json({ data: savedLead, error: null, webhookError })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
