import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import { searchPeople } from '../../../../lib/apollo/client'
import { upsertLeadsWithCampaigns } from '../../../../lib/supabase/leads'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const filters = body.filters || {}
    const sender_info = body.sender_info || null

    const resp = await searchPeople(filters)
    const people = resp?.people || resp?.results || []

    const mapped = people.map((p: any) => ({
      email: p.email || p.primary_email,
      first_name: p.first_name || p.given_name,
      last_name: p.last_name || p.family_name,
      title: p.title,
      company_name: p.organization?.name || p.company,
      company_domain: p.organization?.domain || p.domain,
      linkedin_url: p.linkedin_url,
      city: p.city,
      state: p.state,
      country: p.country,
      industry: p.industry,
      employees: p.organization?.employee_count || null,
      sender_info,
      campaign_id: body.campaign_id || null,
      organization_id: auth.organizationId || null,
      source: 'apollo'
    }))

    const { data, error } = await upsertLeadsWithCampaigns(mapped)
    if (error) return NextResponse.json({ data: null, error })

    const savedLeads = data || mapped
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

    return NextResponse.json({ data: savedLeads, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
