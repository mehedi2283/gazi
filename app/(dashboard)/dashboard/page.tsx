"use client"
import React from 'react'
import StatsGrid from '../../../components/dashboard/StatsGrid'
import CampaignPerformanceChart from '../../../components/dashboard/CampaignPerformanceChart'
import RecentCampaigns from '../../../components/dashboard/RecentCampaigns'
import LeadSourcesChart from '../../../components/dashboard/LeadSourcesChart'
import LeadStatusChart from '../../../components/dashboard/LeadStatusChart'
import DashboardTabs from '../../../components/dashboard/DashboardTabs'
import useDashboardStats from '../../../hooks/useDashboardStats'
import { StatCardSkeleton, Skeleton } from '../../../components/ui/Skeleton'

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardStats()

  const recentCampaigns = data?.recentCampaigns || []
  const campaignPerformance = data?.campaignPerformance || []
  const leadSources = data?.leadSources || {}
  const leadStatuses = data?.leadStatuses || {}

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <h3 className="text-lg font-semibold text-red-400">Unable to load dashboard</h3>
        <p className="mt-1 text-sm text-zinc-400">Please try refreshing the page.</p>
      </div>
    )
  }

  const overviewContent = (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 -mx-2 px-2 pb-2">
      <StatsGrid initialData={data} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <CampaignPerformanceChart data={campaignPerformance} />
        <RecentCampaigns data={recentCampaigns} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <LeadSourcesChart data={leadSources} />
        <LeadStatusChart data={leadStatuses} />
      </div>
    </div>
  )

  return (
    <div>
      <DashboardTabs>{overviewContent}</DashboardTabs>
    </div>
  )
}
