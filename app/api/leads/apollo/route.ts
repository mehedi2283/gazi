import { NextResponse } from 'next/server'
import { sendLeadsToWebhook } from '../../../../lib/webhook/leads'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const payload = {
      source: 'apollo',
      market_name: body.market_name || null,
      product_name: body.product_name || null,
      contacts_wanted: body.contacts_wanted ?? null,
      contact_count: body.contacts_wanted ?? null,
      contacts_count: body.contacts_wanted ?? null,
      desired_contacts: body.contacts_wanted ?? null,
      campaign_id: body.campaign_id || null,
      campaign_name: body.campaign_name || null,
      organization_id: body.organization_id || null
    }

    await sendLeadsToWebhook(payload)

    return NextResponse.json({ data: payload, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
