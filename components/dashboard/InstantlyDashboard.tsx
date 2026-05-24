'use client'

import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartAxisTick, chartGridStroke, chartTooltipProps } from '@/lib/chart-theme'
import ChartTooltip from '../ui/ChartTooltip'

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

const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f43f5e']

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTooltipValue(value: unknown, name: unknown) {
  const numericValue = typeof value === 'number' ? value : Number(value || 0)
  return [numericValue.toLocaleString(), String(name || '')]
}

// ── Custom Concentric Ring Chart ─────────────────────────────────────────────
interface RingData {
  name: string
  value: number
  fill: string
}

function ConcentricRingChart({
  data,
  maxValue,
}: {
  data: RingData[]
  maxValue: number
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const size = 260
  const cx = size / 2
  const cy = size / 2
  const strokeWidth = 18
  const gap = 8

  // Rings go from inside (index 0 = Bounced) to outside (index 3 = Opens)
  const rings = data.map((item, i) => {
    const radius = 36 + i * (strokeWidth + gap)
    const circumference = 2 * Math.PI * radius
    const pct = maxValue > 0 ? Math.min(item.value / maxValue, 1) : 0
    const dashOffset = circumference * (1 - pct)
    return { ...item, radius, circumference, dashOffset, index: i }
  })

  return (
    <div className="relative flex items-center justify-center overflow-visible">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        {rings.map((ring) => {
          const isHovered = hovered === ring.index
          const isAnyHovered = hovered !== null
          const isOther = isAnyHovered && !isHovered

          return (
            <g key={ring.name}>
              {/* Background track */}
              <circle
                cx={cx}
                cy={cy}
                r={ring.radius}
                fill="none"
                stroke="rgba(15,23,42,0.05)"
                strokeWidth={strokeWidth}
                style={{
                  transition: 'opacity 350ms ease, stroke-width 350ms ease',
                  opacity: isOther ? 0.3 : 1,
                  strokeWidth: isHovered ? strokeWidth + 6 : strokeWidth,
                }}
              />
              {/* Value arc */}
              <circle
                cx={cx}
                cy={cy}
                r={ring.radius}
                fill="none"
                stroke={ring.fill}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={ring.circumference}
                strokeDashoffset={ring.dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                onMouseEnter={() => setHovered(ring.index)}
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-dashoffset 600ms ease, opacity 350ms ease, stroke-width 350ms ease, filter 350ms ease',
                  opacity: isOther ? 0.25 : 1,
                  filter: isHovered
                    ? `drop-shadow(0 0 10px ${ring.fill}aa) drop-shadow(0 0 20px ${ring.fill}55)`
                    : 'none',
                }}
              />
            </g>
          )
        })}
        {/* Center label */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#1e293b" fontSize="16" fontWeight="700">
          {maxValue}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="500">
          Total Leads
        </text>
      </svg>

      {/* Floating tooltip */}
      {hovered !== null && data[hovered] && (
        <div
          className="pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-md z-50"
          style={{ minWidth: 100 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{data[hovered].name}</span>
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">{data[hovered].value.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400">
            {maxValue > 0 ? Math.round((data[hovered].value / maxValue) * 100) : 0}% of leads
          </div>
        </div>
      )}
    </div>
  )
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
  if (status === 1) return 'border border-emerald-500/20 bg-emerald-50 text-emerald-700'
  if (status === 2) return 'border border-amber-500/20 bg-amber-50 text-amber-700'
  if (status === 3) return 'border border-slate-300 bg-slate-100 text-slate-700'
  return 'border border-blue-500/20 bg-blue-50 text-blue-700'
}

function LoadingBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/60 ${className || ''}`} />
}

export default function InstantlyDashboard() {
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([])

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

      const response = await fetch(`/api/instantly/stats?start=${start}&end=${end}`)
      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to load instantly stats')
      }

      const dailyData = (result.data.daily || []) as DailyRow[]
      const campaignData = (result.data.campaigns || []) as CampaignRow[]
      const overviewData = result.data.overview || []

      setDailyRows(dailyData)
      setCampaigns(campaignData)

      if (overviewData[0]?.synced_at) {
        setLastSynced(new Date(overviewData[0].synced_at).toLocaleString())
      }
    } catch (error) {
      console.error('Error loading Instantly dashboard data:', error)
      toast.error('Failed to load Instantly analytics')
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
        toast.success('Instantly data synced')
      } else {
        toast.error(typeof result.error === 'string' ? result.error : 'Sync failed')
      }
    } catch {
      toast.error('Sync failed')
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
        name: 'Bounced',
        value: visibleCampaigns.reduce((sum, campaign) => sum + (campaign.bounced_count || 0), 0),
        fill: '#f43f5e', // rose-500
      },
      {
        name: 'Clicks',
        value: visibleCampaigns.reduce((sum, campaign) => sum + (campaign.link_click_count_unique || 0), 0),
        fill: '#06b6d4', // cyan-500
      },
      {
        name: 'Replies',
        value: visibleCampaigns.reduce((sum, campaign) => sum + (campaign.reply_count_unique || 0), 0),
        fill: '#a855f7', // purple-500
      },
      {
        name: 'Opens',
        value: visibleCampaigns.reduce((sum, campaign) => sum + (campaign.open_count_unique || 0), 0),
        fill: '#3b82f6', // blue-500
      },
    ],
    [visibleCampaigns]
  )

  const totalCampaignLeads = visibleCampaigns.reduce((sum, campaign) => sum + (campaign.leads_count || 0), 0)

  const kpis = useMemo(() => {
    const sent = visibleCampaigns.reduce((sum, c) => sum + (c.emails_sent_count || 0), 0)
    const unique_opened = visibleCampaigns.reduce((sum, c) => sum + (c.open_count_unique || 0), 0)
    const unique_replies = visibleCampaigns.reduce((sum, c) => sum + (c.reply_count_unique || 0), 0)
    const bounced = visibleCampaigns.reduce((sum, c) => sum + (c.bounced_count || 0), 0)
    
    return {
      emailsSent: sent,
      openRate: sent > 0 ? (unique_opened / sent) * 100 : 0,
      replyRate: sent > 0 ? (unique_replies / sent) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
    }
  }, [visibleCampaigns])

  return (
    <div className="space-y-8 -mx-2 px-2 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Instantly analytics</h2>
          <p className="mt-1 text-sm text-slate-400">Data is read from Supabase only.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4">
          {lastSynced ? <span className="text-sm text-slate-400">Last synced: {lastSynced}</span> : null}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-95 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white/70 p-1 backdrop-blur-xl shadow-sm">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDateRange(days as 7 | 30 | 90)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                dateRange === days
                  ? 'bg-gradient-to-br from-indigo-600 to-sky-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>

        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 outline-none ring-indigo-500/25 transition focus:ring-2 shadow-sm"
        >
          <option value="all">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.campaign_id} value={campaign.campaign_id}>
              {campaign.campaign_name || campaign.campaign_id}
            </option>
          ))}
        </select>
      </div>

      {selectedCampaign !== 'all' ? (
        <div className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-50/50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
          <span>
            {campaigns.find((c) => c.campaign_id === selectedCampaign)?.campaign_name || selectedCampaign}
          </span>
          <button type="button" onClick={() => setSelectedCampaign('all')} className="ml-1 text-indigo-400 hover:text-indigo-650">
            ×
          </button>
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl">
            <div className="mb-2 text-sm font-medium text-slate-400">Emails sent</div>
            {kpiLoading ? (
              <LoadingBlock className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-slate-850">{kpis.emailsSent.toLocaleString()}</div>
            )}
            <div className="mt-2 text-xs text-slate-400">total sent</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl">
            <div className="mb-2 text-sm font-medium text-slate-400">Open rate</div>
            {kpiLoading ? (
              <LoadingBlock className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-slate-850">{kpis.openRate.toFixed(1)}%</div>
            )}
            <div className="mt-2 text-xs text-slate-400">unique opens</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl">
            <div className="mb-2 text-sm font-medium text-slate-400">Reply rate</div>
            {kpiLoading ? (
              <LoadingBlock className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-slate-850">{kpis.replyRate.toFixed(1)}%</div>
            )}
            <div className="mt-2 text-xs text-slate-400">unique replies</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl">
            <div className="mb-2 text-sm font-medium text-slate-400">Bounce rate</div>
            {kpiLoading ? (
              <LoadingBlock className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-extrabold tracking-tight text-slate-850">{kpis.bounceRate.toFixed(1)}%</div>
            )}
            <div className="mt-2 text-xs text-slate-400">of sent</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="min-h-[360px] rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-700">Daily trend</div>
            </div>
            {selectedCampaign !== 'all' ? (
              <div className="flex h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
                <div>Daily trend data is only available account-wide.</div>
                <div className="mt-2 text-xs text-slate-400">Select "All campaigns" to view this chart.</div>
              </div>
            ) : loading ? (
              <LoadingBlock className="h-[280px] w-full" />
            ) : chartData.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateLabel}
                      tick={chartAxisTick}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={40} />
                    <Tooltip
                      content={<ChartTooltip />}
                      labelFormatter={(value) => `Date: ${formatDateLabel(String(value))}`}
                      formatter={formatTooltipValue}
                    />
                    <Legend wrapperStyle={{ color: '#64748b', fontSize: 12 }} />
                    <Line type="monotone" dataKey="sent" name="Sent" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line
                      type="monotone"
                      dataKey="unique_replies"
                      name="Replies"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="unique_opened"
                      name="Opens"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
                No daily data available for this range.
              </div>
            )}
          </div>

          <div className="min-h-[360px] rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl overflow-visible">
            <div className="mb-4 text-sm font-bold text-slate-700">Engagement breakdown</div>
            {loading ? (
              <LoadingBlock className="h-[280px] w-full" />
            ) : donutData.some((entry) => entry.value > 0) ? (
              <div className="flex h-[280px] w-full items-center justify-center">
                <ConcentricRingChart data={donutData} maxValue={Math.max(1, totalCampaignLeads)} />
              </div>
            ) : (
              <div className="flex h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
                <div>No campaign engagement data available.</div>
                <div className="mt-2 text-xs text-slate-400">Sync Instantly data to populate this chart.</div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
              {donutData.map((entry) => (
                <span key={entry.name} className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: entry.fill }}
                  />
                  {entry.name} {entry.value.toLocaleString()}
                </span>
              ))}
              <span className="inline-flex items-center gap-2 font-semibold text-slate-650">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
                Leads {totalCampaignLeads.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl">
          <div className="mb-4 text-sm font-bold text-slate-700">Campaign performance</div>
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
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 pr-4 pl-2">Campaign</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Leads</th>
                    <th className="py-3 pr-4">Sent</th>
                    <th className="py-3 pr-4">Opens</th>
                    <th className="py-3 pr-4">Replies</th>
                    <th className="py-3 pr-4">Clicks</th>
                    <th className="py-3 pr-4">Bounce</th>
                    <th className="py-3 pr-4">Open%</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCampaigns.map((campaign) => {
                    const sent = campaign.emails_sent_count || 0
                    const openCount = campaign.open_count_unique || 0
                    const openPercent = sent > 0 ? (openCount / sent) * 100 : 0

                    return (
                      <tr
                        key={campaign.campaign_id}
                        className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/50"
                      >
                        <td className="max-w-[280px] truncate py-3 pr-4 pl-2 font-semibold text-slate-800">
                          {campaign.campaign_name || campaign.campaign_id}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-medium ${getStatusBadgeClasses(campaign.campaign_status)}`}
                          >
                            {getStatusLabel(campaign.campaign_status)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{(campaign.leads_count || 0).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-slate-600">{sent.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-slate-600">{openCount.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-slate-600">{(campaign.reply_count_unique || 0).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-slate-600">{(campaign.link_click_count_unique || 0).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-slate-600">{(campaign.bounced_count || 0).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-slate-600">{sent > 0 ? `${openPercent.toFixed(1)}%` : '0.0%'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-slate-500">
              No campaigns found for the current view.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
