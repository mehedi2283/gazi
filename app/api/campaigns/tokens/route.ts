import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import { requireApiAuth, isAuthResponse } from '../../../../lib/api/auth'

export async function GET(request: Request) {
  const auth = await requireApiAuth(request)
  if (isAuthResponse(auth)) return auth

  const { searchParams } = new URL(request.url)
  const clientEmail = searchParams.get('client_email')?.trim().toLowerCase()

  if (!clientEmail) {
    return NextResponse.json({ data: [] })
  }

  const { data, error } = await supabase
    .from('campaigns')
    .select('calendly_token, name')
    .eq('client_email', clientEmail)
    .not('calendly_token', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ data: [], error: error.message })
  }

  // Deduplicate by token value
  const seen = new Set<string>()
  const unique = (data || []).filter((row: any) => {
    if (!row.calendly_token || seen.has(row.calendly_token)) return false
    seen.add(row.calendly_token)
    return true
  }).map((row: any) => ({
    token: row.calendly_token,
    campaign_name: row.name || 'Unnamed'
  }))

  return NextResponse.json({ data: unique })
}
