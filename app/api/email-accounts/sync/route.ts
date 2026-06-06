import { NextResponse } from 'next/server'
import { listAccounts } from '../../../../lib/instantly/client'
import supabase from '../../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'

function getInstantlyAccounts(response: any): any[] {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.items)) return response.data.items
  if (Array.isArray(response?.items)) return response.items
  return []
}

function getAccountEmail(account: any) {
  return String(account?.email || account?.email_address || '').trim().toLowerCase()
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const res = await listAccounts(search ? { limit: 100, search } : { limit: 100 })
    const items = getInstantlyAccounts(res)
    const matchedItems = search
      ? items.filter((item: any) => getAccountEmail(item) === search)
      : items

    if (!Array.isArray(items) || items.length === 0) {
      if (search) {
        return NextResponse.json({ data: { synced: 0, local: [], matched: [] }, error: null })
      }

      return NextResponse.json({ data: null, error: 'No accounts returned from Instantly' }, { status: 502 })
    }

    if (search && matchedItems.length === 0) {
      return NextResponse.json({ data: { synced: 0, local: [], matched: [] }, error: null })
    }

    const rows = matchedItems.map((it: any) => ({
      email_address: (it.email || it.email_address || '').toString().trim().toLowerCase(),
      account_name: it.account_name || it.email || it.email_address || '',
      provider: 'instantly',
      synced_at: new Date().toISOString()
    })).filter((r: any) => r.email_address)

    if (rows.length === 0) {
      return NextResponse.json({ data: null, error: 'No valid email addresses returned from Instantly' }, { status: 502 })
    }

    const { error } = await supabase.from('email_accounts').upsert(rows, { onConflict: 'email_address' })
    if (error) return NextResponse.json({ data: null, error: error.message || error }, { status: 500 })

    let localQuery = supabase.from('email_accounts').select('id,email_address,account_name,provider').order('email_address', { ascending: true })
    if (search) localQuery = localQuery.eq('email_address', search)
    const { data: local } = await localQuery

    return NextResponse.json({ data: { synced: rows.length, local: local || [], matched: rows }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}
