import { NextResponse } from 'next/server'
import { listAccounts } from '../../../../lib/instantly/client'
import supabase from '../../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    let instantlyAccounts: any = null
    try {
      const res = await listAccounts()
      instantlyAccounts = res?.data || res
    } catch (err: any) {
      instantlyAccounts = { error: String(err?.message || err) }
    }

    const { data: localAccounts, error: localErr } = await supabase
      .from('email_accounts')
      .select('id, email_address, account_name, provider, synced_at')
      .order('email_address', { ascending: true })

    return NextResponse.json({ instantlyAccounts, localAccounts: localAccounts || [], localError: localErr || null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
