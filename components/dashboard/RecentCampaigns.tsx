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
  switch (status) {
    case 'active':
      return 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    case 'paused':
      return 'border border-amber-500/25 bg-amber-500/10 text-amber-200'
    case 'draft':
      return 'border border-zinc-500/30 bg-zinc-500/10 text-zinc-300'
    case 'completed':
      return 'border border-blue-500/25 bg-blue-500/10 text-blue-200'
    default:
      return 'border border-zinc-500/30 bg-zinc-800/60 text-zinc-300'
  }
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
        <h3 className="text-base font-semibold text-zinc-100">Recent campaigns</h3>
        <p className="text-sm text-zinc-500">Latest campaign activity</p>
      </div>

      {!data?.length ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-zinc-500">No campaigns found yet.</div>
      ) : (
        <div className="space-y-2">
          {data.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              className="flex cursor-default items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 transition-colors"
            >
              <div>
                <div className="font-medium text-zinc-100">{campaign.name}</div>
                <div className="text-xs text-zinc-500">{formatCampaignDate(campaign.created_at)}</div>
              </div>
              <span className={`rounded-xl px-3 py-1 text-xs font-semibold capitalize ${statusStyles(campaign.status)}`}>
                {campaign.status}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
