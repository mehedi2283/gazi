"use client"
import React from 'react'
import useStats from '../../hooks/useStats'

type StatsGridProps = {
  initialData?: {
    totalLeads: number
    activeCampaigns: number
    replyRate: string
    openRate: string
  }
}

export default function StatsGrid({ initialData }: StatsGridProps) {
  const query = useStats()
  const data = initialData || query.data
  const isLoading = !initialData && query.isLoading
  const error = query.error

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="bg-white p-4 rounded-xl shadow animate-pulse h-24" />
  ))}</div>
  if (error) return <div className="text-red-600">Error loading stats</div>

  const stats = data || { totalLeads: 0, activeCampaigns: 0, replyRate: '0%', openRate: '0%' }

  const cards = [
    { label: 'Total Leads', value: stats.totalLeads },
    { label: 'Active Campaigns', value: stats.activeCampaigns },
    { label: 'Reply Rate', value: stats.replyRate },
    { label: 'Open Rate', value: stats.openRate }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white p-4 rounded-xl shadow flex items-center gap-4 border border-slate-100">
          <div className="flex-1">
            <div className="text-sm text-slate-500">{card.label}</div>
            <div className="text-2xl font-bold">{card.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
