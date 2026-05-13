'use client'

import React, { useState, useEffect } from 'react'
import { syncInstantly } from '@/lib/instantly/sync'
import { supabase } from '@/lib/supabase/client'

interface KPIs {
  emailsSent: number
  openRate: number
  replyRate: number
  bounceRate: number
}

export default function InstantlyDashboard() {
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<KPIs>({
    emailsSent: 0,
    openRate: 0,
    replyRate: 0,
    bounceRate: 0,
  })
  const [kpiLoading, setKpiLoading] = useState(true)

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns()
  }, [])

  // Reload KPIs when date range or campaign changes
  useEffect(() => {
    loadKPIs()
  }, [dateRange, selectedCampaign])

  const loadCampaigns = async () => {
    try {
      const { data } = await supabase
        .from('instantly_campaigns')
        .select('campaign_id, campaign_name')
        .order('campaign_name')

      setCampaigns(data || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - dateRange)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }

  const loadKPIs = async () => {
    setKpiLoading(true)
    try {
      const { start, end } = getDateRange()

      let query = supabase
        .from('instantly_daily')
        .select('*')
        .gte('date', start)
        .lte('date', end)

      const { data: dailyData } = await query

      if (!dailyData || dailyData.length === 0) {
        setKpis({
          emailsSent: 0,
          openRate: 0,
          replyRate: 0,
          bounceRate: 0,
        })
        setKpiLoading(false)
        return
      }

      // Aggregate data
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
      const openRate = emailsSent > 0 ? (totals.unique_opened / emailsSent) * 100 : 0
      const replyRate = emailsSent > 0 ? (totals.unique_replies / emailsSent) * 100 : 0
      const bounceRate = emailsSent > 0 ? (totals.bounced / emailsSent) * 100 : 0

      setKpis({
        emailsSent,
        openRate,
        replyRate,
        bounceRate,
      })
    } catch (error) {
      console.error('Error loading KPIs:', error)
    } finally {
      setKpiLoading(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    const result = await syncInstantly()

    if (result.success) {
      setLastSynced(new Date().toLocaleTimeString())
      await loadCampaigns()
    } else {
      console.error('Sync failed:', result.error)
    }

    setIsSyncing(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Instantly Analytics</h1>
        <div className="flex items-center gap-4">
          {lastSynced && (
            <span className="text-sm text-gray-600">
              Last synced: {lastSynced}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-8 flex-wrap">
        {/* Date Range Toggle */}
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow">
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

        {/* Campaign Dropdown */}
        <select
          value={selectedCampaign || 'all'}
          onChange={(e) =>
            setSelectedCampaign(e.target.value === 'all' ? null : e.target.value)
          }
          className="px-4 py-1 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          <option value="all">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.campaign_id} value={campaign.campaign_id}>
              {campaign.campaign_name || campaign.campaign_id}
            </option>
          ))}
        </select>
      </div>

      {/* Active Campaign Tag */}
      {selectedCampaign && (
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm">
          <span>
            {campaigns.find((c) => c.campaign_id === selectedCampaign)
              ?.campaign_name || selectedCampaign}
          </span>
          <button
            onClick={() => setSelectedCampaign(null)}
            className="ml-2 text-indigo-700 hover:text-indigo-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Emails Sent */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Emails Sent</div>
          {kpiLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {kpis.emailsSent.toLocaleString()}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">total sent</div>
        </div>

        {/* Open Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Open Rate</div>
          {kpiLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {kpis.openRate.toFixed(1)}%
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">unique opens</div>
        </div>

        {/* Reply Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Reply Rate</div>
          {kpiLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {kpis.replyRate.toFixed(1)}%
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">unique replies</div>
        </div>

        {/* Bounce Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Bounce Rate</div>
          {kpiLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {kpis.bounceRate.toFixed(1)}%
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">of sent</div>
        </div>
      </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 h-64 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="bg-gray-100 h-52 rounded"></div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 h-64 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="bg-gray-100 h-52 rounded"></div>
          </div>
        </div>

        {/* Table Placeholder */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
