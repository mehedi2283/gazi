import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import Papa from 'papaparse'
import { upsertLeadsWithCampaigns } from '../../../../lib/supabase/leads'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { csv, campaign_id, organization_id, sender_info } = body
    if (!csv) return NextResponse.json({ data: null, error: 'Missing csv payload' })

    const parsed = Papa.parse(csv, { header: true })
    const rows = parsed.data || []

    function normalizeKeys(obj: any) {
      const out: Record<string, any> = {}
      Object.keys(obj || {}).forEach((k) => {
        const nk = String(k || '')
          .trim()
          .replace(/\s+/g, '_')
          .replace(/[^\w_]/g, '')
        out[nk] = obj[k]
      })
      return out
    }

    function findByKeys(obj: any, keys: string[], substrFallback?: string) {
      for (const k of keys.map((key) => String(key || '').trim().replace(/\s+/g, '_').replace(/[^\w_]/g, ''))) {
        if (obj[k] != null && obj[k] !== '') return obj[k]
      }
      if (substrFallback) {
        const fallback = String(substrFallback || '').trim().replace(/\s+/g, '_').replace(/[^\w_]/g, '')
        const found = Object.keys(obj).find((kk) => kk.includes(fallback))
        if (found) return obj[found]
      }
      return undefined
    }

    const mapped = rows.map((r: any) => {
      const nr = normalizeKeys(r)
      return {
        organization_id: organization_id || null,
        campaign_id: campaign_id || null,
        sender_info: sender_info || null,
        email: findByKeys(nr, ['Email'], 'Email'),
        first_name: findByKeys(nr, ['First Name'], 'First Name'),
        last_name: findByKeys(nr, ['Last Name'], 'Last Name'),
        title: findByKeys(nr, ['Title'], 'Title'),
        company_name: findByKeys(nr, ['Company Name'], 'Company Name'),
        company_linkedin_url: findByKeys(nr, ['Company Linkedin Url'], 'Company Linkedin Url'),
        company_domain: findByKeys(nr, ['Company Domain'], 'Company Domain'),
        website: findByKeys(nr, ['Website'], 'Website'),
        linkedin_url: findByKeys(nr, ['Person Linkedin Url'], 'Person Linkedin Url'),
        facebook_url: findByKeys(nr, ['Facebook Url'], 'Facebook Url'),
        twitter_url: findByKeys(nr, ['Twitter Url'], 'Twitter Url'),
        city: findByKeys(nr, ['City'], 'City'),
        state: findByKeys(nr, ['State'], 'State'),
        country: findByKeys(nr, ['Country'], 'Country'),
        company_address: findByKeys(nr, ['Company Address'], 'Company Address'),
        company_city: findByKeys(nr, ['Company City'], 'Company City'),
        company_state: findByKeys(nr, ['Company State'], 'Company State'),
        company_country: findByKeys(nr, ['Company Country'], 'Company Country'),
        company_phone: findByKeys(nr, ['Company Phone'], 'Company Phone'),
        technologies: findByKeys(nr, ['Technologies'], 'Technologies'),
        industry: findByKeys(nr, ['Industry'], 'Industry'),
        employees: findByKeys(nr, ['# Employees'], '# Employees'),
        annual_revenue: findByKeys(nr, ['Annual Revenue'], 'Annual Revenue'),
        total_funding: findByKeys(nr, ['Total Funding'], 'Total Funding'),
        latest_funding: findByKeys(nr, ['Latest Funding'], 'Latest Funding'),
        latest_funding_amount: findByKeys(nr, ['Latest Funding Amount'], 'Latest Funding Amount'),
        last_raised_at: findByKeys(nr, ['Last Raised At'], 'Last Raised At'),
        sent_at: findByKeys(nr, ['sent_at'], 'sent_at'),
        status: findByKeys(nr, ['status'], 'status'),
        source: 'csv'
      }
    })

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
