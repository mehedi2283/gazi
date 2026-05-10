import { NextResponse } from 'next/server'
import { pauseCampaign } from '../../../../../lib/instantly/client'
import supabase from '../../../../../lib/supabase/server'

function mapInstantlyStatus(status: unknown) {
  const statuses: Record<string, string> = {
    '-99': 'account_suspended',
    '-1': 'accounts_unhealthy',
    '-2': 'bounce_protect',
    '0': 'draft',
    '1': 'active',
    '2': 'paused',
    '3': 'completed',
    '4': 'running_subsequences'
  }

  return statuses[String(status)] || 'paused'
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data: campaign, error: campaignError } = await supabase.from('campaigns').select('instantly_campaign_id').eq('id', params.id).single()
    if (campaignError) return NextResponse.json({ data: null, error: campaignError.message })

    let newStatus = 'paused'
    let instantlyResp: any = null

    if (campaign?.instantly_campaign_id) {
      try {
        instantlyResp = await pauseCampaign(campaign.instantly_campaign_id)
        newStatus = mapInstantlyStatus(instantlyResp?.data?.status)
      } catch (e: any) {
        await supabase.from('campaigns').update({ status: 'error' }).eq('id', params.id)
        return NextResponse.json({ data: null, error: e?.message || String(e) })
      }
    }

    const { data, error } = await supabase.from('campaigns').update({ status: newStatus }).eq('id', params.id).select()
    if (error) return NextResponse.json({ data: null, error: error.message })
    return NextResponse.json({ data: { ...data?.[0], instantlyResponse: instantlyResp?.data || null }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
