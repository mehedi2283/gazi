import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import Papa from 'papaparse'
import { mapLeadsForWebhook, sendLeadsToWebhook } from '../../../../lib/webhook/leads'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { csv, campaign_id, organization_id } = body
    if (!csv) return NextResponse.json({ data: null, error: 'Missing csv payload' })

    const parsed = Papa.parse(csv, { header: true })
    const rows = parsed.data || []

    function normalizeKeys(obj: any) {
      const out: Record<string, any> = {}
      Object.keys(obj || {}).forEach((k) => {
        const nk = String(k || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w_]/g, '')
        out[nk] = obj[k]
      })
      return out
    }

    function findByKeys(obj: any, keys: string[], substrFallback?: string) {
      for (const k of keys) {
        if (obj[k] != null && obj[k] !== '') return obj[k]
      }
      if (substrFallback) {
        const found = Object.keys(obj).find((kk) => kk.includes(substrFallback))
        if (found) return obj[found]
      }
      return undefined
    }

    const mapped = rows.map((r: any) => {
      const nr = normalizeKeys(r)
      return {
        organization_id: organization_id || null,
        campaign_id: campaign_id || null,
        email: findByKeys(nr, ['email', 'e_mail', 'e-mail'], 'email'),
        first_name: findByKeys(nr, ['first_name', 'firstname', 'first'], 'first'),
        last_name: findByKeys(nr, ['last_name', 'lastname', 'last'], 'last'),
        company_name: findByKeys(nr, ['company_name', 'company', 'companyname'], 'company'),
        company_domain: findByKeys(nr, ['company_domain', 'domain', 'companydomain'], 'domain'),
        website: findByKeys(nr, ['website', 'url', 'site'], 'web'),
        linkedin_url: findByKeys(nr, ['linkedin_url', 'linkedin', 'person_linkedin_url', 'company_linkedin_url'], 'linkedin'),
        city: findByKeys(nr, ['city'], 'city'),
        state: findByKeys(nr, ['state'], 'state'),
        country: findByKeys(nr, ['country'], 'country'),
        industry: findByKeys(nr, ['industry'], 'industry'),
        employees: (findByKeys(nr, ['employees', 'employee_count', 'number_of_employees'], 'employee') || null),
        annual_revenue: findByKeys(nr, ['annual_revenue', 'revenue'], 'revenue'),
        phone: findByKeys(nr, ['phone', 'phone_number', 'telephone'], 'phone'),
        title: findByKeys(nr, ['title', 'role', 'position'], 'title'),
        source: 'csv'
      }
    })

    const { data, error } = await supabase.from('leads').insert(mapped).select()
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
