"use client"
import React from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '../ui/GlassCard'

type Campaign = {
  id: string
  name: string
  status: string
  created_at?: string
}

function statusStyles(status: string) {
  const norm = status.toLowerCase()
  if (norm === 'active') {
    return 'border border-emerald-500/20 bg-emerald-50 text-emerald-700'
  }
  if (norm === 'paused') {
    return 'border border-amber-500/20 bg-amber-50 text-amber-700'
  }
  if (norm === 'draft') {
    return 'border border-slate-300 bg-slate-100 text-slate-700'
  }
  if (norm === 'completed') {
    return 'border border-blue-500/20 bg-blue-50 text-blue-700'
  }
  return 'border border-red-500/20 bg-red-50 text-red-700'
}

function formatCampaignDate(value?: string) {
  if (!value) return 'Recently created'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently created'

  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()

  return `${month}/${day}/${year}`
}

export default function RecentCampaigns({ data }: { data: Campaign[] }) {
  return (
    <GlassCard hover={false} className="min-h-[320px] p-5">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-700">Recent campaigns</h3>
        <p className="text-sm text-slate-400 font-medium">Latest campaign activity</p>
      </div>

      {!data?.length ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400 font-medium">No campaign activity yet.</div>
      ) : (
        <div className="space-y-2">
          {data.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              whileHover={{ backgroundColor: 'rgba(15, 23, 42, 0.015)' }}
              className="flex cursor-default items-center justify-between rounded-lg border border-slate-100 bg-white/40 px-3 py-3 transition-colors shadow-sm"
            >
              <div>
                <div className="font-semibold text-slate-800">{campaign.name}</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">{formatCampaignDate(campaign.created_at)}</div>
              </div>
              <span className={`rounded-xl px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles(campaign.status)}`}>
                {campaign.status}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
