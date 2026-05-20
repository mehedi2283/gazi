import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../../lib/api/auth'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0



function safeRate(numerator: number, denominator: number) {
  if (!denominator) return '0%'
  return `${Math.round((numerator / denominator) * 100)}%`
}

function scopeCampaignQuery(query: any, auth: { userId: string; organizationId: string | null }) {
  if (auth.organizationId) {
    return query.eq('organization_id', auth.organizationId)
  }

  return query.eq('created_by', auth.userId)
}

function scopeLeadQuery(query: any, auth: { userId: string; organizationId: string | null }) {
  if (auth.organizationId) {
    return query.eq('organization_id', auth.organizationId)
  }

  return null
}

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    const leadsBreakdownQuery = scopeLeadQuery(
      supabase.from('leads').select('source, lead_score').limit(50000),
      auth
    )

    const [
      totalLeadsRes,
      activeLeadsRes,
      campaignsRes,
      recentCampaignsRes,
      leadsBreakdownRes
    ] = await Promise.all([
      scopeLeadQuery(supabase.from('leads').select('id', { count: 'exact', head: true }), auth),
      scopeLeadQuery(supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'active'), auth),
      scopeCampaignQuery(
        supabase
          .from('campaigns')
          .select('id, name, status, created_at, total_leads, total_booking_count, open_count, reply_count')
          .order('created_at', { ascending: false })
          .limit(1000),
        auth
      ),
      scopeCampaignQuery(
        supabase
          .from('campaigns')
          .select('id, name, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        auth
      ),
      leadsBreakdownQuery
    ])

    if (!totalLeadsRes || !activeLeadsRes || !leadsBreakdownRes) {
      return NextResponse.json({
        data: {
          totalLeads: 0,
          activeLeads: 0,
          activeCampaigns: 0,
          replyRate: '0%',
          openRate: '0%',
          recentCampaigns: [],
          leadSources: {},
          leadStatuses: {},
          campaignPerformance: []
        },
        error: null
      })
    }

    if (totalLeadsRes.error) return NextResponse.json({ data: null, error: totalLeadsRes.error.message })
    if (activeLeadsRes.error) return NextResponse.json({ data: null, error: activeLeadsRes.error.message })
    if (campaignsRes.error) return NextResponse.json({ data: null, error: campaignsRes.error.message })
    if (recentCampaignsRes.error) return NextResponse.json({ data: null, error: recentCampaignsRes.error.message })
    if (leadsBreakdownRes.error) return NextResponse.json({ data: null, error: leadsBreakdownRes.error.message })

    const campaigns = campaignsRes.data || []
    const recentCampaigns = recentCampaignsRes.data || []
    const leadsBreakdown = (leadsBreakdownRes.data || []) as any[]
    const campaignIds = campaigns.map((campaign: any) => campaign.id).filter(Boolean)
    const statsRes = campaignIds.length
      ? await supabase
          .from('campaign_stats')
          .select('campaign_id, date, emails_sent, opens, replies, clicks, bounces')
          .in('campaign_id', campaignIds)
          .order('date', { ascending: false })
          .limit(30)
      : { data: [], error: null }

    if (statsRes.error) return NextResponse.json({ data: null, error: statsRes.error.message })

    const stats = statsRes.data || []

    const totalLeads = totalLeadsRes.count || 0
    const activeLeads = activeLeadsRes.count || 0
    const activeCampaigns = campaigns.filter((campaign: any) => campaign.status === 'active').length
    const totalOpens = stats.reduce((sum: number, stat: any) => sum + (stat.opens || 0), 0)
    const totalReplies = stats.reduce((sum: number, stat: any) => sum + (stat.replies || 0), 0)
    const replyRate = safeRate(totalReplies, totalLeads)
    const openRate = safeRate(totalOpens, totalLeads)

    const leadSources = leadsBreakdown.reduce<Record<string, number>>((acc, lead: any) => {
      const source = lead.source || 'manual'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    const leadStatuses = leadsBreakdown.reduce<Record<string, number>>((acc, lead: any) => {
      const status = lead.lead_score || 'cold'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const campaignPerformance = Array.from(
      stats
        .reduce((map, row) => {
          const key = String(row.date)
          const current = map.get(key) || { date: key, emailsSent: 0, opens: 0, replies: 0, clicks: 0, bounces: 0 }
          current.emailsSent += row.emails_sent || 0
          current.opens += row.opens || 0
          current.replies += row.replies || 0
          current.clicks += row.clicks || 0
          current.bounces += row.bounces || 0
          map.set(key, current)
          return map
        }, new Map<string, { date: string; emailsSent: number; opens: number; replies: number; clicks: number; bounces: number }>())
        .values()
    ).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      data: {
        totalLeads,
        activeLeads,
        activeCampaigns,
        replyRate,
        openRate,
        recentCampaigns,
        leadSources,
        leadStatuses,
        campaignPerformance
      },
      error: null
    })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
