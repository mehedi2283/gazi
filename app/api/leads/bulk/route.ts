import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import { mapLeadsForWebhook, sendLeadsToWebhook } from '../../../../lib/webhook/leads'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { leads, campaign_id, organization_id } = body

    // validate minimal shape
    const sanitized = (leads || []).map((l: any) => ({
      organization_id: l.organization_id || organization_id || null,
      campaign_id: l.campaign_id || campaign_id || null,
      email: l.email,
      first_name: l.first_name,
      last_name: l.last_name,
      title: l.title,
      company_name: l.company_name,
      company_linkedin_url: l.company_linkedin_url,
      company_domain: l.company_domain,
      website: l.website,
      linkedin_url: l.linkedin_url,
      facebook_url: l.facebook_url,
      twitter_url: l.twitter_url,
      city: l.city,
      state: l.state,
      country: l.country,
      company_address: l.company_address,
      company_city: l.company_city,
      company_state: l.company_state,
      company_country: l.company_country,
      company_phone: l.company_phone,
      technologies: l.technologies,
      industry: l.industry,
      employees: l.employees ? Number(l.employees) : null,
      annual_revenue: l.annual_revenue,
      total_funding: l.total_funding,
      latest_funding: l.latest_funding,
      latest_funding_amount: l.latest_funding_amount,
      last_raised_at: l.last_raised_at,
      sent_at: l.sent_at,
      phone: l.phone || l.company_phone || null,
      source: l.source || 'manual'
    }))

    const { data, error } = await supabase.from('leads').insert(sanitized).select()
    if (error) return NextResponse.json({ data: null, error })

    const savedLeads = data || sanitized
    const localCampaignIds = Array.from(new Set(
      savedLeads
        .map((lead: any) => (lead?.campaign_id ? String(lead.campaign_id) : null))
        .filter(Boolean)
    )) as string[]
    const campaignMetaByLocalId = new Map<string, { instantly_campaign_id: string | null, sequence_count: number }>()

    if (localCampaignIds.length > 0) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, instantly_campaign_id')
        .in('id', localCampaignIds)

      const { data: sequences } = await supabase
        .from('sequences')
        .select('campaign_id')
        .in('campaign_id', localCampaignIds)

      const sequenceCountByCampaignId = new Map<string, number>()
      for (const sequence of sequences || []) {
        const campaignId = String(sequence.campaign_id)
        sequenceCountByCampaignId.set(campaignId, (sequenceCountByCampaignId.get(campaignId) || 0) + 1)
      }

      for (const campaign of campaigns || []) {
        if (campaign?.id) {
          const campaignId = String(campaign.id)
          campaignMetaByLocalId.set(campaignId, {
            instantly_campaign_id: campaign?.instantly_campaign_id ? String(campaign.instantly_campaign_id) : null,
            sequence_count: sequenceCountByCampaignId.get(campaignId) || 0
          })
        }
      }
    }

    const webhookPayload = mapLeadsForWebhook(savedLeads, campaignMetaByLocalId)

    let webhookError: string | null = null
    try {
      await sendLeadsToWebhook(webhookPayload)
    } catch (e) {
      webhookError = e instanceof Error ? e.message : String(e)
    }

    return NextResponse.json({ data: savedLeads, error: null, webhookError })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
