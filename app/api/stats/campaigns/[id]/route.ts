import { NextResponse } from 'next/server'
import supabase from '../../../../../lib/supabase/server'
import { isAuthResponse, requireApiAuth } from '../../../../../lib/api/auth'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireApiAuth(req)
    if (isAuthResponse(auth)) return auth

    let campaignQuery = supabase.from('campaigns').select('*').eq('id', params.id)
    campaignQuery = auth.organizationId ? campaignQuery.eq('organization_id', auth.organizationId) : campaignQuery.eq('created_by', auth.userId)

    const campaignRes = await campaignQuery.single()

    if (campaignRes.error) return NextResponse.json({ data: null, error: campaignRes.error.message })

    const [leadsRes, statsRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, status, lead_score, email_open_count, email_reply_count, email_click_count, created_at')
        .or(`campaign_id.eq.${params.id},campaign_ids.cs.{${params.id}}`)
        .limit(5000),
      supabase.from('campaign_stats').select('*').eq('campaign_id', params.id).order('date', { ascending: true })
    ])

    if (leadsRes.error) return NextResponse.json({ data: null, error: leadsRes.error.message })
    if (statsRes.error) return NextResponse.json({ data: null, error: statsRes.error.message })

    const leads = (leadsRes.data || []) as Array<{
      email_open_count: number | null
      email_reply_count: number | null
    }>
    const stats = statsRes.data || []

    const totalLeads = leads.length
    const openRate = totalLeads ? `${Math.round((leads.reduce((sum, lead) => sum + (lead.email_open_count || 0), 0) / totalLeads) * 100)}%` : '0%'
    const replyRate = totalLeads ? `${Math.round((leads.reduce((sum, lead) => sum + (lead.email_reply_count || 0), 0) / totalLeads) * 100)}%` : '0%'

    return NextResponse.json({
      data: {
        campaign: campaignRes.data,
        leads,
        stats,
        totalLeads,
        openRate,
        replyRate
      },
      error: null
    })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || String(err) })
  }
}
