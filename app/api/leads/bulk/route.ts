import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import { addLeadsBulk } from '../../../../lib/instantly/client'

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
      company_name: l.company_name,
      company_domain: l.company_domain,
      website: l.website,
      linkedin_url: l.linkedin_url,
      city: l.city,
      state: l.state,
      country: l.country,
      industry: l.industry,
      employees: l.employees ? Number(l.employees) : null,
      annual_revenue: l.annual_revenue,
      phone: l.phone,
      title: l.title,
      source: l.source || 'manual'
    }))

    const { data, error } = await supabase.from('leads').insert(sanitized).select()
    if (error) return NextResponse.json({ data: null, error })

    // push to Instantly in background
    try {
      await addLeadsBulk(sanitized)
    } catch (e) {
      // ignore here
    }

    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
