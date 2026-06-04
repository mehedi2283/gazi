import { NextResponse } from 'next/server'
import { isAuthResponse, requireApiAuth } from '../../../../../lib/api/auth'
import supabase from '../../../../../lib/supabase/server'

const WEEKLY_REPORT_WEBHOOK_URL = 'https://gaziai.app.n8n.cloud/webhook/2c0029df-5e78-45a6-9deb-397c910f0b36'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    if (auth.role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Only admins can send weekly reports' }, { status: 403 })
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, instantly_campaign_id')
      .eq('id', params.id)
      .maybeSingle()

    if (campaignError) {
      return NextResponse.json({ data: null, error: campaignError.message }, { status: 500 })
    }

    if (!campaign?.instantly_campaign_id) {
      return NextResponse.json({ data: null, error: 'Missing Instantly campaign ID' }, { status: 400 })
    }

    const webhookResponse = await fetch(WEEKLY_REPORT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        instantly_campaign_id: campaign.instantly_campaign_id
      })
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text().catch(() => '')
      return NextResponse.json(
        {
          data: null,
          error: errorText || 'Failed to trigger weekly report webhook'
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      data: {
        campaign_id: campaign.id,
        instantly_campaign_id: campaign.instantly_campaign_id
      },
      error: null
    })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) }, { status: 500 })
  }
}