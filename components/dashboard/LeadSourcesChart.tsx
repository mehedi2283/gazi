"use client"
import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { GlassCard } from '../ui/GlassCard'
import { chartTooltipProps } from '@/lib/chart-theme'

const SOURCE_COLORS: Record<string, string> = {
  import: '#1d8a48', // Google Sheets Green
  apollo: '#ebf212',
  manual: '#3b82f6',
  other: '#6366f1'
}

const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#6366f1', '#06b6d4', '#a855f7']

export default function LeadSourcesChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data || {}).map(([name, value]) => ({ name, value }))
  if (!rows.length) {
    return (
      <GlassCard hover={false} className="flex min-h-[320px] items-center justify-center p-6">
        <p className="text-sm text-zinc-500">No lead source data yet.</p>
      </GlassCard>
    )
  }

  const getCellColor = (name: string, index: number) => {
    const key = name.toLowerCase()
    return SOURCE_COLORS[key] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  }

  return (
    <GlassCard hover={false} className="min-h-[320px] p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-zinc-100">Top lead sources</h3>
        <p className="text-sm text-zinc-500">Distribution by import source</p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fill: '#a1a1aa', fontSize: 11 }}>
              {rows.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getCellColor(entry.name, index)} stroke="rgba(10,10,10,0.5)" strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip {...chartTooltipProps} />
            <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}
