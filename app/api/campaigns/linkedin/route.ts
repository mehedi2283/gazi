import { NextResponse } from 'next/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'
import { sendLinkedInLeadsToWebhook } from '../../../../lib/webhook/leads'

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const payload = await req.json()

    if (!payload?.campaign_name) {
      return NextResponse.json({ data: null, error: 'Campaign name is required' }, { status: 400 })
    }

    if (!['linkedin', 'linkedin_outreach'].includes(payload?.channel)) {
      return NextResponse.json({ data: null, error: 'Invalid LinkedIn campaign payload' }, { status: 400 })
    }

    await sendLinkedInLeadsToWebhook({
      ...payload,
      channel: 'linkedin_outreach',
      campaign_type: 'linkedin_outreach',
      organization_id: auth.organizationId || null,
      created_by: auth.userId || null,
      source: 'linkedin_campaign_launch'
    })

    return NextResponse.json({ data: { ok: true }, error: null })
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err?.message || String(err) },
      { status: 500 }
    )
  }
}
