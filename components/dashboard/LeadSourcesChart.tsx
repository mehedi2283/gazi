"use client"
import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { GlassCard } from '../ui/GlassCard'
import { chartTooltipProps } from '@/lib/chart-theme'
import ChartTooltip from '../ui/ChartTooltip'

const SOURCE_COLORS: Record<string, string> = {
  import: '#10b981', // Emerald
  apollo: '#6366f1', // Indigo
  manual: '#0ea5e9', // Sky
  other: '#a855f7'   // Purple
}

const SOURCE_LABELS: Record<string, string> = {
  apollo: 'External'
}

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#0ea5e9', '#10b981']

export default function LeadSourcesChart({ data }: { data: Record<string, number> }) {
  const getSourceLabel = (value: string) => SOURCE_LABELS[value.toLowerCase()] || value

  const rows = Object.entries(data || {}).map(([name, value]) => ({ key: name, name: getSourceLabel(name), value }))
  if (!rows.length) {
    return (
      <GlassCard hover={false} className="flex min-h-[320px] items-center justify-center p-6">
        <p className="text-sm text-slate-400 font-medium">No lead source data yet.</p>
      </GlassCard>
    )
  }

  const getCellColor = (key: string, index: number) => {
    const k = String(key || '').toLowerCase()
    return SOURCE_COLORS[k] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
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
                <Cell key={`cell-${index}`} fill={getCellColor(entry.key, index)} stroke="#ffffff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend formatter={(value: any, entry: any) => (
              <span className="text-slate-600 font-medium text-xs capitalize" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, background: entry?.color || '#cbd5e1', borderRadius: 4, display: 'inline-block' }} />
                <span>{getSourceLabel(String(value))}</span>
              </span>
            )} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}
