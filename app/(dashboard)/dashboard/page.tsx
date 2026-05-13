import React from 'react'
import StatsGrid from '../../../components/dashboard/StatsGrid'
import CampaignPerformanceChart from '../../../components/dashboard/CampaignPerformanceChart'
import RecentCampaigns from '../../../components/dashboard/RecentCampaigns'
import LeadSourcesChart from '../../../components/dashboard/LeadSourcesChart'
import LeadStatusChart from '../../../components/dashboard/LeadStatusChart'
import DashboardTabs from '../../../components/dashboard/DashboardTabs'
import { headers } from 'next/headers'

async function getDashboardData() {
  const requestHeaders = headers()
  const host = requestHeaders.get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL || ''
  const res = await fetch(`${baseUrl}/api/stats/dashboard`, { cache: 'no-store' })
  if (!res.ok) return null
  const json = await res.json()
  return json.data
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  const recentCampaigns = data?.recentCampaigns || []
  const campaignPerformance = data?.campaignPerformance || []
  const leadSources = data?.leadSources || {}
  const leadStatuses = data?.leadStatuses || {}

  const overviewContent = (
    <>
      <StatsGrid initialData={data} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <CampaignPerformanceChart data={campaignPerformance} />
        <RecentCampaigns data={recentCampaigns} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <LeadSourcesChart data={leadSources} />
        <LeadStatusChart data={leadStatuses} />
      </div>
    </>
  )

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <DashboardTabs>{overviewContent}</DashboardTabs>
    </div>
  )
}
