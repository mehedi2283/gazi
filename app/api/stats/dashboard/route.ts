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
      leadsBreakdownRes,
      instantlyCampaignsRes
    ] = await Promise.all([
      scopeLeadQuery(supabase.from('leads').select('id', { count: 'exact', head: true }), auth),
      scopeLeadQuery(supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'active'), auth),
      scopeCampaignQuery(
        supabase
          .from('campaigns')
          .select('id, name, status, created_at, instantly_campaign_id')
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
      leadsBreakdownQuery,
      // Fetch Instantly analytics data - the real source of truth for email engagement
      supabase
        .from('instantly_campaigns')
        .select('campaign_id, emails_sent_count, open_count_unique, reply_count_unique, bounced_count, leads_count')
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
    const instantlyCampaigns = instantlyCampaignsRes?.data || []

    const totalLeads = totalLeadsRes.count || 0
    const activeLeads = activeLeadsRes.count || 0
    const activeCampaigns = campaigns.filter((campaign: any) => campaign.status === 'active').length

    // Build a set of instantly_campaign_ids that belong to this org's campaigns
    const orgInstantlyIds = new Set(
      campaigns.map((c: any) => c.instantly_campaign_id).filter(Boolean)
    )

    // Filter instantly_campaigns to only include ones linked to this org
    const orgInstantlyData = instantlyCampaigns.filter((ic: any) =>
      orgInstantlyIds.has(ic.campaign_id)
    )

    // Calculate reply rate from Instantly data (the real source of truth)
    const totalEmailsSent = orgInstantlyData.reduce((sum: number, ic: any) => sum + (ic.emails_sent_count || 0), 0)
    const totalReplies = orgInstantlyData.reduce((sum: number, ic: any) => sum + (ic.reply_count_unique || 0), 0)
    const totalOpens = orgInstantlyData.reduce((sum: number, ic: any) => sum + (ic.open_count_unique || 0), 0)
    const replyRate = safeRate(totalReplies, totalEmailsSent || totalLeads)
    const openRate = safeRate(totalOpens, totalEmailsSent || totalLeads)

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

    // Build campaign performance from Instantly analytics data
    const campaignPerformance = orgInstantlyData
      .map((ic: any) => {
        // Find the matching local campaign to get the created_at date
        const localCamp = campaigns.find((c: any) => c.instantly_campaign_id === ic.campaign_id)
        return {
          date: localCamp?.created_at ? String(localCamp.created_at).split('T')[0] : 'unknown',
          emailsSent: ic.emails_sent_count || 0,
          opens: ic.open_count_unique || 0,
          replies: ic.reply_count_unique || 0,
          clicks: 0,
          bounces: ic.bounced_count || 0,
        }
      })
      .filter((p: any) => p.date !== 'unknown')
      .sort((a: any, b: any) => a.date.localeCompare(b.date))

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
