import axios from 'axios'
import { supabaseServer } from '../supabase/server'

const INSTANTLY_BASE_URL = 'https://api.instantly.ai/api/v2'

interface SyncResult {
  success: boolean
  error?: string
  timestamp: string
  campaignsCount?: number
  dailyCount?: number
}

/**
 * Syncs Instantly.ai analytics data to Supabase
 * Fetches campaigns, daily analytics, and overview
 * Returns sync result with timestamp
 */
export async function syncInstantly(): Promise<SyncResult> {
  const timestamp = new Date().toISOString()
  const instantlyApiKey = process.env.INSTANTLY_API_KEY

  if (!instantlyApiKey) {
    return {
      success: false,
      error: 'Missing INSTANTLY_API_KEY in environment variables',
      timestamp,
    }
  }

  try {
    const headers = {
      Authorization: `Bearer ${instantlyApiKey}`,
    }

    // Fetch all 3 endpoints in parallel
    const [campaignsRes, dailyRes, overviewRes] = await Promise.all([
      axios.get(`${INSTANTLY_BASE_URL}/campaigns/analytics`, { headers }),
      axios.get(`${INSTANTLY_BASE_URL}/accounts/analytics/daily`, {
        headers,
        params: {
          start_date: getDateRange(90).start,
          end_date: getDateRange(90).end,
        },
      }),
      axios.get(`${INSTANTLY_BASE_URL}/campaigns/analytics/overview`, { headers }),
    ])

    const campaigns = campaignsRes.data || []
    const daily = dailyRes.data || []
    const overview = overviewRes.data || {}

    // Upsert campaigns
    if (campaigns.length > 0) {
      await supabaseServer.from('instantly_campaigns').upsert(
        campaigns.map((c: any) => ({
          campaign_id: c.campaign_id,
          campaign_name: c.campaign_name,
          campaign_status: c.campaign_status,
          leads_count: c.leads_count || 0,
          contacted_count: c.contacted_count || 0,
          emails_sent_count: c.emails_sent_count || 0,
          new_leads_contacted_count: c.new_leads_contacted_count || 0,
          open_count_unique: c.open_count_unique || 0,
          reply_count_unique: c.reply_count_unique || 0,
          link_click_count_unique: c.link_click_count_unique || 0,
          bounced_count: c.bounced_count || 0,
          unsubscribed_count: c.unsubscribed_count || 0,
          completed_count: c.completed_count || 0,
          synced_at: timestamp,
        })),
        { onConflict: 'campaign_id' }
      )
    }

    // Upsert daily analytics
    if (daily.length > 0) {
      await supabaseServer.from('instantly_daily').upsert(
        daily.map((d: any) => ({
          date: d.date,
          email_account: d.email_account || 'default',
          sent: d.sent || 0,
          bounced: d.bounced || 0,
          opened: d.opened || 0,
          unique_opened: d.unique_opened || 0,
          replies: d.replies || 0,
          unique_replies: d.unique_replies || 0,
          clicks: d.clicks || 0,
          unique_clicks: d.unique_clicks || 0,
          contacted: d.contacted || 0,
          new_leads_contacted: d.new_leads_contacted || 0,
          synced_at: timestamp,
        })),
        { onConflict: 'date,email_account' }
      )
    }

    // Insert overview (new row each sync)
    await supabaseServer.from('instantly_overview').insert({
      emails_sent_count: overview.emails_sent_count || 0,
      open_count_unique: overview.open_count_unique || 0,
      reply_count_unique: overview.reply_count_unique || 0,
      link_click_count_unique: overview.link_click_count_unique || 0,
      bounced_count: overview.bounced_count || 0,
      contacted_count: overview.contacted_count || 0,
      total_interested: overview.total_interested || 0,
      total_meeting_booked: overview.total_meeting_booked || 0,
      total_meeting_completed: overview.total_meeting_completed || 0,
      total_closed: overview.total_closed || 0,
      synced_at: timestamp,
    })

    return {
      success: true,
      timestamp,
      campaignsCount: campaigns.length,
      dailyCount: daily.length,
    }
  } catch (error: any) {
    console.error('Sync error:', error)
    return {
      success: false,
      error: error?.message || 'Unknown sync error',
      timestamp,
    }
  }
}

/**
 * Helper: get date range for API calls
 */
function getDateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}
