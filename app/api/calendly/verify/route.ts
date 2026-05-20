import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthResponse } from '../../../../lib/api/auth'

export async function POST(request: Request) {
  const auth = await requireApiAuth(request)
  if (isAuthResponse(auth)) return auth

  try {
    const body = await request.json()
    const token = body?.token?.trim()

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Token is required' }, { status: 400 })
    }

    const res = await fetch('https://api.calendly.com/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (res.status === 200) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({
      ok: false,
      error: 'This Calendly token is not available for use or expired'
    })
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message || String(err)
    }, { status: 500 })
  }
}
