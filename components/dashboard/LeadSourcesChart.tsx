"use client"
import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { GlassCard } from '../ui/GlassCard'
import { chartTooltipProps } from '@/lib/chart-theme'

const SOURCE_COLORS: Record<string, string> = {
  import: '#10b981', // Emerald
  apollo: '#6366f1', // Indigo
  manual: '#0ea5e9', // Sky
  other: '#a855f7'   // Purple
}

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#0ea5e9', '#10b981']

export default function LeadSourcesChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data || {}).map(([name, value]) => ({ name, value }))
  if (!rows.length) {
    return (
      <GlassCard hover={false} className="flex min-h-[320px] items-center justify-center p-6">
        <p className="text-sm text-slate-400 font-medium">No lead source data yet.</p>
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
        <h3 className="text-base font-bold text-slate-700">Top lead sources</h3>
        <p className="text-sm text-slate-400 font-medium">Distribution by import source</p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}>
              {rows.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getCellColor(entry.name, index)} stroke="#ffffff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip {...chartTooltipProps} />
            <Legend formatter={(value) => <span className="text-slate-600 font-medium text-xs capitalize">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}
