import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const payload = {
      source: 'sender',
      sender_info: {
        name: body.name || null,
        company: body.company || null,
        location: body.location || null,
        address: body.address || null,
        booking_calendar_link: body.booking_calendar_link || null
      },
      name: body.name || null,
      company: body.company || null,
      location: body.location || null,
      address: body.address || null,
      booking_calendar_link: body.booking_calendar_link || null,
      campaign_id: body.campaign_id || null,
      campaign_name: body.campaign_name || null,
      organization_id: body.organization_id || null
    }

    return NextResponse.json({ data: payload, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
