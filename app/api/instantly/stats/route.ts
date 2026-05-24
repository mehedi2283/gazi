import { NextResponse } from 'next/server'
import { supabaseServer } from '../../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    let dailyQuery = supabaseServer
      .from('instantly_daily')
      .select('*')
      .order('date', { ascending: true })

    if (start) dailyQuery = dailyQuery.gte('date', start)
    if (end) dailyQuery = dailyQuery.lte('date', end)

    // Fetch local campaigns for the authenticated organization to scope the Instantly campaigns
    const { data: localCampaigns, error: lcError } = await supabaseServer
      .from('campaigns')
      .select('instantly_campaign_id')
      .eq('organization_id', auth.organizationId)
      .not('instantly_campaign_id', 'is', null)

    if (lcError) {
      return NextResponse.json({ error: lcError.message }, { status: 500 })
    }

    const activeInstantlyIds = (localCampaigns || [])
      .map((lc: any) => lc.instantly_campaign_id)
      .filter(Boolean)

    const [dailyResult, campaignsResult, overviewResult] = await Promise.all([
      dailyQuery,
      supabaseServer
        .from('instantly_campaigns')
        .select('*')
        .in('campaign_id', activeInstantlyIds)
        .order('synced_at', { ascending: false }),
      supabaseServer
        .from('instantly_overview')
        .select('synced_at')
        .order('synced_at', { ascending: false })
        .limit(1),
    ])

    if (dailyResult.error) return NextResponse.json({ error: dailyResult.error.message }, { status: 500 })
    if (campaignsResult.error) return NextResponse.json({ error: campaignsResult.error.message }, { status: 500 })
    if (overviewResult.error) return NextResponse.json({ error: overviewResult.error.message }, { status: 500 })

    return NextResponse.json({
      data: {
        daily: dailyResult.data || [],
        campaigns: campaignsResult.data || [],
        overview: overviewResult.data || []
      },
      error: null
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
