import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import { searchPeople } from '../../../../lib/apollo/client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const filters = body.filters || {}

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
      source: 'apollo'
    }))

    const { data, error } = await supabase.from('leads').insert(mapped).select()
    if (error) return NextResponse.json({ data: null, error })
    return NextResponse.json({ data, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
