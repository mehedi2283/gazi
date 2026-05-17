"use client"
import React from 'react'
import { motion } from 'framer-motion'
import { Users, UserCheck, Megaphone, MessageCircleReply } from 'lucide-react'
import useStats from '../../hooks/useStats'
import { GlassCard } from '../ui/GlassCard'
import { StatCardSkeleton } from '../ui/Skeleton'

type StatsGridProps = {
  initialData?: {
    totalLeads: number
    activeLeads?: number
    activeCampaigns: number
    replyRate: string
    openRate: string
  }
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 }
  }
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
}

const icons = [Users, UserCheck, Megaphone, MessageCircleReply] as const

export default function StatsGrid({ initialData }: StatsGridProps) {
  const query = useStats()
  const data = initialData || query.data
  const isLoading = !initialData && query.isLoading
  const error = query.error

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
        Unable to load stats. Check your connection and try again.
      </div>
    )
  }

  const stats = data || { totalLeads: 0, activeLeads: 0, activeCampaigns: 0, replyRate: '0%', openRate: '0%' }

  const cards = [
    { label: 'Total leads', value: stats.totalLeads },
    { label: 'Active leads', value: stats.activeLeads },
    { label: 'Active campaigns', value: stats.activeCampaigns },
    { label: 'Reply rate', value: stats.replyRate }
  ]

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {cards.map((card, index) => {
        const Icon = icons[index] ?? Users
        return (
          <motion.div key={card.label} variants={item}>
            <GlassCard className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
                  <Icon className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</div>
                  <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-850">{card.value}</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
