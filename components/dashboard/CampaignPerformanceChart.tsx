"use client"
import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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
    return <div className="bg-white p-4 rounded-xl shadow min-h-[320px] flex items-center justify-center text-slate-500">No campaign activity yet.</div>
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow min-h-[320px]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Campaign Performance</h3>
        <p className="text-sm text-slate-500">Emails sent vs replies over time</p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="emailsSent" stroke="#4f46e5" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="replies" stroke="#16a34a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
