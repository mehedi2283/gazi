'use client'

import React, { useState, useEffect } from 'react'
import { syncInstantly } from '@/lib/instantly/sync'
import { supabase } from '@/lib/supabase/client'

export default function InstantlyDashboard() {
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns()
  }, [])

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
        {/* KPI Cards Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow p-6 h-24 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
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
