import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import Papa from 'papaparse'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { csv, campaign_id, organization_id } = body
    if (!csv) return NextResponse.json({ data: null, error: 'Missing csv payload' })

    const parsed = Papa.parse(csv, { header: true })
    const rows = parsed.data || []

    const mapped = rows.map((r: any) => ({
      organization_id: organization_id || null,
      campaign_id: campaign_id || null,
      email: r.email,
      first_name: r.first_name || r.firstName || r.first,
      last_name: r.last_name || r.lastName || r.last,
      company_name: r.company || r.company_name,
      company_domain: r.company_domain || r.domain,
      website: r.website,
      linkedin_url: r.linkedin_url,
      city: r.city,
      state: r.state,
      country: r.country,
      industry: r.industry,
      employees: r.employees ? Number(r.employees) : null,
      annual_revenue: r.annual_revenue,
      phone: r.phone,
      title: r.title,
      source: 'csv'
    }))

    const { data, error } = await supabase.from('leads').insert(mapped).select()
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
