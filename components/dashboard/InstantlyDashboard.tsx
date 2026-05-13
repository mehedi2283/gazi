'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface KPIs {
  emailsSent: number
  openRate: number
  replyRate: number
  bounceRate: number
}

interface DailyRow {
  date: string
  email_account: string
  sent: number | null
  bounced: number | null
  opened: number | null
  unique_opened: number | null
  replies: number | null
  unique_replies: number | null
  clicks: number | null
  unique_clicks: number | null
  contacted: number | null
  new_leads_contacted: number | null
}

interface CampaignRow {
  campaign_id: string
  campaign_name: string | null
  campaign_status: number | null
  leads_count: number | null
  contacted_count: number | null
  emails_sent_count: number | null
  new_leads_contacted_count: number | null
  open_count_unique: number | null
  reply_count_unique: number | null
  link_click_count_unique: number | null
  bounced_count: number | null
  unsubscribed_count: number | null
  completed_count: number | null
  synced_at: string | null
}

interface AggregatedDailyRow {
  date: string
  sent: number
  bounced: number
  opened: number
  unique_opened: number
  replies: number
  unique_replies: number
  clicks: number
  unique_clicks: number
  contacted: number
  new_leads_contacted: number
}

const DONUT_COLORS = ['#2563EB', '#059669', '#D97706', '#DC2626']

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function groupDailyRows(rows: DailyRow[]): AggregatedDailyRow[] {
  const grouped = rows.reduce<Record<string, AggregatedDailyRow>>((acc, row) => {
    if (!acc[row.date]) {
      acc[row.date] = {
        date: row.date,
        sent: 0,
        bounced: 0,
        opened: 0,
        unique_opened: 0,
        replies: 0,
        unique_replies: 0,
        clicks: 0,
        unique_clicks: 0,
        contacted: 0,
        new_leads_contacted: 0,
      }
    }

    acc[row.date].sent += row.sent || 0
    acc[row.date].bounced += row.bounced || 0
    acc[row.date].opened += row.opened || 0
    acc[row.date].unique_opened += row.unique_opened || 0
    acc[row.date].replies += row.replies || 0
    acc[row.date].unique_replies += row.unique_replies || 0
    acc[row.date].clicks += row.clicks || 0
    acc[row.date].unique_clicks += row.unique_clicks || 0
    acc[row.date].contacted += row.contacted || 0
    acc[row.date].new_leads_contacted += row.new_leads_contacted || 0

    return acc
  }, {})

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
}

function getStatusLabel(status: number | null) {
  if (status === 1) return 'Active'
  if (status === 2) return 'Paused'
  if (status === 3) return 'Completed'
  return 'Draft'
}

function getStatusBadgeClasses(status: number | null) {
  if (status === 1) return 'bg-emerald-100 text-emerald-700'
  if (status === 2) return 'bg-amber-100 text-amber-700'
  if (status === 3) return 'bg-slate-100 text-slate-700'
  return 'bg-indigo-100 text-indigo-700'
}

function LoadingBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className || ''}`} />
}

export default function InstantlyDashboard() {
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([])
  const [kpis, setKpis] = useState<KPIs>({
    emailsSent: 0,
    openRate: 0,
    replyRate: 0,
    bounceRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [kpiLoading, setKpiLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [dateRange])

  const getDateRange = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - dateRange)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    setKpiLoading(true)

    try {
      const { start, end } = getDateRange()

      const [dailyResult, campaignsResult, overviewResult] = await Promise.all([
        supabase
          .from('instantly_daily')
          .select('*')
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: true }),
        supabase
          .from('instantly_campaigns')
          .select('*')
          .order('synced_at', { ascending: false }),
        supabase
          .from('instantly_overview')
          .select('synced_at')
          .order('synced_at', { ascending: false })
          .limit(1),
      ])

      const dailyData = (dailyResult.data || []) as DailyRow[]
      const campaignData = (campaignsResult.data || []) as CampaignRow[]
      const overviewData = overviewResult.data || []

      setDailyRows(dailyData)
      setCampaigns(campaignData)

      if (overviewData[0]?.synced_at) {
        setLastSynced(new Date(overviewData[0].synced_at).toLocaleString())
      }

      const totals = dailyData.reduce(
        (acc, row) => ({
          sent: acc.sent + (row.sent || 0),
          unique_opened: acc.unique_opened + (row.unique_opened || 0),
          unique_replies: acc.unique_replies + (row.unique_replies || 0),
          bounced: acc.bounced + (row.bounced || 0),
        }),
        { sent: 0, unique_opened: 0, unique_replies: 0, bounced: 0 }
      )

      const emailsSent = totals.sent

      setKpis({
        emailsSent,
        openRate: emailsSent > 0 ? (totals.unique_opened / emailsSent) * 100 : 0,
        replyRate: emailsSent > 0 ? (totals.unique_replies / emailsSent) * 100 : 0,
        bounceRate: emailsSent > 0 ? (totals.bounced / emailsSent) * 100 : 0,
      })
    } catch (error) {
      console.error('Error loading Instantly dashboard data:', error)
    } finally {
      setLoading(false)
      setKpiLoading(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)

    try {
      const response = await fetch('/api/instantly/sync', { method: 'POST' })
      const result = await response.json()

      if (response.ok && result.success) {
        setLastSynced(new Date(result.timestamp || Date.now()).toLocaleString())
        await loadDashboardData()
      } else {
        console.error('Sync failed:', result.error)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const chartData = useMemo(() => groupDailyRows(dailyRows), [dailyRows])

  const visibleCampaigns = useMemo(() => {
    if (selectedCampaign === 'all') return campaigns
    return campaigns.filter((campaign) => campaign.campaign_id === selectedCampaign)
  }, [campaigns, selectedCampaign])

  const donutData = useMemo(
    () => [
      {
        name: 'Opens',
        value: visibleCampaigns.reduce((sum, campaign) => sum + (campaign.open_count_unique || 0), 0),
      },
      {
        name: 'Replies',
        value: visibleCampaigns.reduce((sum, campaign) => sum + (campaign.reply_count_unique || 0), 0),
      },
      {
        name: 'Clicks',
        value: visibleCampaigns.reduce((sum, campaign) => sum + (campaign.link_click_count_unique || 0), 0),
      },
      {
        name: 'Bounced',
        value: visibleCampaigns.reduce((sum, campaign) => sum + (campaign.bounced_count || 0), 0),
      },
    ],
    [visibleCampaigns]
  )

  const totalCampaignLeads = visibleCampaigns.reduce((sum, campaign) => sum + (campaign.leads_count || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Instantly Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Data is read from Supabase only.</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          {lastSynced && <span className="text-sm text-gray-600">Last synced: {lastSynced}</span>}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-8 flex-wrap">
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setDateRange(days as 7 | 30 | 90)}
              className={`px-3 py-1 rounded font-medium text-sm transition ${
                dateRange === days
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>

        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          <option value="all">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.campaign_id} value={campaign.campaign_id}>
              {campaign.campaign_name || campaign.campaign_id}
            </option>
          ))}
        </select>
      </div>

      {selectedCampaign !== 'all' && (
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm">
          <span>
            {campaigns.find((c) => c.campaign_id === selectedCampaign)?.campaign_name || selectedCampaign}
          </span>
          <button
            onClick={() => setSelectedCampaign('all')}
            className="ml-2 text-indigo-700 hover:text-indigo-900"
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">Emails Sent</div>
            {kpiLoading ? (
              <LoadingBlock className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold text-gray-900">{kpis.emailsSent.toLocaleString()}</div>
            )}
            <div className="text-xs text-gray-500 mt-2">total sent</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">Open Rate</div>
            {kpiLoading ? (
              <LoadingBlock className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-gray-900">{kpis.openRate.toFixed(1)}%</div>
            )}
            <div className="text-xs text-gray-500 mt-2">unique opens</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">Reply Rate</div>
            {kpiLoading ? (
              <LoadingBlock className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-gray-900">{kpis.replyRate.toFixed(1)}%</div>
            )}
            <div className="text-xs text-gray-500 mt-2">unique replies</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">Bounce Rate</div>
            {kpiLoading ? (
              <LoadingBlock className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold text-gray-900">{kpis.bounceRate.toFixed(1)}%</div>
            )}
            <div className="text-xs text-gray-500 mt-2">of sent</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 min-h-[360px]">
            <div className="text-sm font-semibold text-gray-700 mb-4">Daily trend</div>
            {loading ? (
              <LoadingBlock className="h-[280px] w-full" />
            ) : chartData.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateLabel}
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <Tooltip
                      labelFormatter={(value) => `Date: ${formatDateLabel(String(value))}`}
                      formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      name="Sent"
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="unique_replies"
                      name="Replies"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="unique_opened"
                      name="Opens"
                      stroke="#D97706"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No daily data available for this range.
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6 min-h-[360px]">
            <div className="text-sm font-semibold text-gray-700 mb-4">Engagement breakdown</div>
            {loading ? (
              <LoadingBlock className="h-[280px] w-full" />
            ) : donutData.some((entry) => entry.value > 0) ? (
              <div className="h-[280px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={112}
                      paddingAngle={2}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={entry.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [value.toLocaleString(), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <div>No campaign engagement data available.</div>
                <div className="mt-2 text-xs text-gray-400">Sync Instantly data to populate this chart.</div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
              {donutData.map((entry, index) => (
                <span key={entry.name} className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                  />
                  {entry.name} {entry.value.toLocaleString()}
                </span>
              ))}
              <span className="inline-flex items-center gap-2 font-medium text-gray-700">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />
                Leads {totalCampaignLeads.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-semibold text-gray-700 mb-4">Campaign performance</div>
          {loading ? (
            <div className="space-y-3">
              <LoadingBlock className="h-10 w-full" />
              <LoadingBlock className="h-10 w-full" />
              <LoadingBlock className="h-10 w-full" />
              <LoadingBlock className="h-10 w-full" />
            </div>
          ) : visibleCampaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-3 pr-4 font-medium">Campaign</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Leads</th>
                    <th className="py-3 pr-4 font-medium">Sent</th>
                    <th className="py-3 pr-4 font-medium">Opens</th>
                    <th className="py-3 pr-4 font-medium">Replies</th>
                    <th className="py-3 pr-4 font-medium">Clicks</th>
                    <th className="py-3 pr-4 font-medium">Bounce</th>
                    <th className="py-3 pr-4 font-medium">Open%</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCampaigns.map((campaign) => {
                    const sent = campaign.emails_sent_count || 0
                    const openCount = campaign.open_count_unique || 0
                    const openPercent = sent > 0 ? (openCount / sent) * 100 : 0

                    return (
                      <tr key={campaign.campaign_id} className="border-b border-gray-100 last:border-b-0">
                        <td className="py-3 pr-4 font-medium text-gray-900 max-w-[280px] truncate">
                          {campaign.campaign_name || campaign.campaign_id}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClasses(campaign.campaign_status)}`}
                          >
                            {getStatusLabel(campaign.campaign_status)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{(campaign.leads_count || 0).toLocaleString()}</td>
                        <td className="py-3 pr-4">{sent.toLocaleString()}</td>
                        <td className="py-3 pr-4">{openCount.toLocaleString()}</td>
                        <td className="py-3 pr-4">{(campaign.reply_count_unique || 0).toLocaleString()}</td>
                        <td className="py-3 pr-4">{(campaign.link_click_count_unique || 0).toLocaleString()}</td>
                        <td className="py-3 pr-4">{(campaign.bounced_count || 0).toLocaleString()}</td>
                        <td className="py-3 pr-4">{sent > 0 ? `${openPercent.toFixed(1)}%` : '0.0%'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              No campaigns found for the current view.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
