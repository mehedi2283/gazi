"use client"
import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { GlassCard } from '../ui/GlassCard'
import { chartAxisTick, chartGridStroke, chartTooltipProps } from '@/lib/chart-theme'

type Point = {
  date: string
  emailsSent: number
  opens: number
  replies: number
  clicks: number
  bounces: number
}

export default function CampaignPerformanceChart({ data }: { data: Point[] }) {
  if (!data?.length) {
    return (
      <GlassCard hover={false} className="flex min-h-[320px] items-center justify-center p-6">
        <p className="text-sm text-slate-400 font-medium">No campaign activity yet.</p>
      </GlassCard>
    )
  }

  return (
    <GlassCard hover={false} className="min-h-[320px] p-5">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-700">Campaign performance</h3>
        <p className="text-sm text-slate-400 font-medium">Emails sent vs replies over time</p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
            <XAxis dataKey="date" tick={chartAxisTick} axisLine={false} tickLine={false} />
            <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={36} />
            <Tooltip {...chartTooltipProps} />
            <Legend formatter={(value) => <span className="text-slate-600 font-medium text-xs capitalize">{value}</span>} />
            <Line type="monotone" dataKey="emailsSent" name="Sent" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="replies" name="Replies" stroke="#ec4899" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}
