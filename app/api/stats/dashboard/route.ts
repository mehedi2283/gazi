import { NextResponse } from 'next/server'
import supabase from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0



function safeRate(numerator: number, denominator: number) {
  if (!denominator) return '0%'
  return `${Math.round((numerator / denominator) * 100)}%`
}

export async function GET() {
  try {
    const [leadsRes, campaignsRes, statsRes] = await Promise.all([
      supabase.from('leads').select('id, source, status, lead_score, created_at, email_open_count, email_reply_count'),
      supabase.from('campaigns').select('id, name, status, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('campaign_stats').select('campaign_id, date, emails_sent, opens, replies, clicks, bounces').order('date', { ascending: false }).limit(30)
    ])

    if (leadsRes.error) return NextResponse.json({ data: null, error: leadsRes.error.message })
    if (campaignsRes.error) return NextResponse.json({ data: null, error: campaignsRes.error.message })
    if (statsRes.error) return NextResponse.json({ data: null, error: statsRes.error.message })

    const leads = leadsRes.data || []
    const campaigns = campaignsRes.data || []
    const stats = statsRes.data || []

    const totalLeads = leads.length
    const activeLeads = leads.filter((lead) => lead.status === 'active').length
    const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active').length
    const totalOpens = leads.reduce((sum, lead) => sum + (lead.email_open_count || 0), 0)
    const totalReplies = leads.reduce((sum, lead) => sum + (lead.email_reply_count || 0), 0)
    const replyRate = safeRate(totalReplies, totalLeads)
    const openRate = safeRate(totalOpens, totalLeads)

    const leadSources = leads.reduce<Record<string, number>>((acc, lead) => {
      const source = lead.source || 'manual'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    const leadStatuses = leads.reduce<Record<string, number>>((acc, lead) => {
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
        recentCampaigns: campaigns,
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
