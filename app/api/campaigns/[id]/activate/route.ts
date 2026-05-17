import { NextResponse } from 'next/server'
import { activateCampaign } from '../../../../../lib/instantly/client'
import supabase from '../../../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../../../lib/api/auth'

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

  return statuses[String(status)] || 'active'
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    let campaignQuery = supabase.from('campaigns').select('instantly_campaign_id').eq('id', params.id)
    campaignQuery = auth.organizationId ? campaignQuery.eq('organization_id', auth.organizationId) : campaignQuery.eq('created_by', auth.userId)

    const { data: campaign, error: campaignError } = await campaignQuery.single()
    if (campaignError) return NextResponse.json({ data: null, error: campaignError.message })

    let newStatus = 'active'
    let instantlyResp: any = null

    if (campaign?.instantly_campaign_id) {
      try {
        instantlyResp = await activateCampaign(campaign.instantly_campaign_id)
        newStatus = mapInstantlyStatus(instantlyResp?.data?.status)
      } catch (e: any) {
        await supabase.from('campaigns').update({ status: 'error' }).eq('id', params.id)
        return NextResponse.json({ data: null, error: e?.message || String(e) })
      }
    }

    let updateQuery = supabase.from('campaigns').update({ status: newStatus }).eq('id', params.id)
    updateQuery = auth.organizationId ? updateQuery.eq('organization_id', auth.organizationId) : updateQuery.eq('created_by', auth.userId)
    const { data, error } = await updateQuery.select()
    if (error) return NextResponse.json({ data: null, error: error.message })
    return NextResponse.json({ data: { ...data?.[0], instantlyResponse: instantlyResp?.data || null }, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
