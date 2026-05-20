"use client"
import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { GlassCard } from '../ui/GlassCard'
import { chartTooltipProps } from '@/lib/chart-theme'

const STATUS_COLORS: Record<string, string> = {
  cold: '#3b82f6', // Cool Blue
  warm: '#f59e0b', // Warm Amber
  hot: '#ef4444',  // Hot Red
  neutral: '#64748b' // Slate Gray
}

const DEFAULT_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981']

export default function LeadStatusChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data || {}).map(([name, value]) => ({ name, value }))
  if (!rows.length) {
    return (
      <GlassCard hover={false} className="flex min-h-[320px] items-center justify-center p-6">
        <p className="text-sm text-slate-400 font-medium">No lead status data yet.</p>
      </GlassCard>
    )
  }

  const getCellColor = (name: string, index: number) => {
    const key = name.toLowerCase()
    return STATUS_COLORS[key] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  }

  return (
    <GlassCard hover={false} className="min-h-[320px] p-5">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-700">Lead status</h3>
        <p className="text-sm text-slate-400 font-medium">Current lead score mix</p>
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
