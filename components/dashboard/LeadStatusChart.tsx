"use client"
import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#ef4444', '#f97316', '#3b82f6', '#64748b', '#10b981']

export default function LeadStatusChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data || {}).map(([name, value]) => ({ name, value }))
  if (!rows.length) {
    return <div className="bg-white p-4 rounded-xl shadow min-h-[320px] flex items-center justify-center text-slate-500">No lead status data yet.</div>
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow min-h-[320px]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Lead Status</h3>
        <p className="text-sm text-slate-500">Current lead score mix</p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {rows.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
