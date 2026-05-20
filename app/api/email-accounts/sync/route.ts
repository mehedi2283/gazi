import { NextResponse } from 'next/server'
import { listAccounts } from '../../../../lib/instantly/client'
import supabase from '../../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const res = await listAccounts()
    const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || res?.items || [])

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ data: null, error: 'No accounts returned from Instantly' }, { status: 502 })
    }

    const rows = items.map((it: any) => ({
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

    const { data: local } = await supabase.from('email_accounts').select('id,email_address,account_name,provider').order('email_address', { ascending: true })

    return NextResponse.json({ data: { synced: rows.length, local: local || [] }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}
