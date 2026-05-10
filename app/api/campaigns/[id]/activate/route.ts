import { NextResponse } from 'next/server'
import { activateCampaign } from '../../../../../lib/instantly/client'
import supabase from '../../../../../lib/supabase/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data: campaign, error: campaignError } = await supabase.from('campaigns').select('instantly_campaign_id').eq('id', params.id).single()
    if (campaignError) return NextResponse.json({ data: null, error: campaignError.message })

    if (campaign?.instantly_campaign_id) {
      await activateCampaign(campaign.instantly_campaign_id)
    }

    const { data, error } = await supabase.from('campaigns').update({ status: 'active' }).eq('id', params.id).select()
    if (error) return NextResponse.json({ data: null, error: error.message })
    return NextResponse.json({ data: data?.[0], error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
