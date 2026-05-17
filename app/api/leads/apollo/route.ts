import { NextResponse } from 'next/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const body = await req.json()

    const payload = {
      source: 'apollo',
      sender_info: body.sender_info || null,
      market_name: body.market_name || null,
      market_segments: Array.isArray(body.market_segments) && body.market_segments.length ? body.market_segments : null,
      product_name: body.product_name || null,
      contacts_wanted: body.contacts_wanted ?? null,
      campaign_id: body.campaign_id || null,
      campaign_name: body.campaign_name || null,
      organization_id: body.organization_id || auth.organizationId || null
    }

    return NextResponse.json({ data: payload, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
