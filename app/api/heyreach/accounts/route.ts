import { NextResponse } from 'next/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'

function normalizeHeyReachAccount(account: any, accountId: string) {
  const firstName = account?.firstName || account?.first_name || ''
  const lastName = account?.lastName || account?.last_name || ''
  const fullName = account?.name || account?.fullName || account?.full_name || [firstName, lastName].filter(Boolean).join(' ')
  const email = account?.email || account?.emailAddress || account?.email_address || account?.mailbox || ''

  return {
    id: String(account?.id || account?.accountId || account?.account_id || accountId),
    name: String(fullName || email || `Account ${accountId}`),
    email: String(email || ''),
    raw: account
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const apiKey = process.env.HEYREACH_API_KEY
    if (!apiKey) {
      return NextResponse.json({ data: null, error: 'HeyReach API key is not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const accountId = (searchParams.get('accountId') || '').trim()

    if (!/^\d+$/.test(accountId)) {
      return NextResponse.json({ data: null, error: 'A numeric HeyReach account ID is required' }, { status: 400 })
    }

    const url = new URL('https://api.heyreach.io/api/public/li_account/GetById')
    url.searchParams.set('accountId', accountId)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'text/plain'
      },
      cache: 'no-store'
    })

    const responseText = await response.text().catch(() => '')

    if (!response.ok) {
      return NextResponse.json(
        { data: null, error: responseText || `HeyReach account lookup failed with status ${response.status}` },
        { status: response.status }
      )
    }

    let parsed: any = responseText
    try {
      parsed = responseText ? JSON.parse(responseText) : null
    } catch {
      parsed = responseText
    }

    const account = parsed?.data || parsed?.result || parsed?.account || parsed
    if (!account || typeof account !== 'object') {
      return NextResponse.json({ data: null, error: 'HeyReach account was not found' }, { status: 404 })
    }

    return NextResponse.json({ data: normalizeHeyReachAccount(account, accountId), error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err?.message || String(err) }, { status: 500 })
  }
}
