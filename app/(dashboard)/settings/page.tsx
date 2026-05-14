'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Building2, Bell, Shield } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Building2, title: 'Organization', body: 'Workspace name, domains, and defaults.' },
          { icon: Bell, title: 'Notifications', body: 'Alerts for sync, replies, and errors.' },
          { icon: Shield, title: 'Security', body: 'Sessions, API access, and audit preferences.' }
        ].map((card, i) => {
          const Icon = card.icon
          return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <GlassCard className="h-full p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
                <Icon className="h-5 w-5 text-white" aria-hidden />
              </div>
              <h2 className="text-base font-semibold text-zinc-100">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{card.body}</p>
            </GlassCard>
          </motion.div>
          )
        })}
      </div>

      <GlassCard hover={false} className="p-8">
        <p className="text-sm leading-relaxed text-zinc-400">
          Organization and account settings will live here. We&apos;ll mirror the same glass, quiet hierarchy used across
          the dashboard so configuration feels as polished as the rest of the product.
        </p>
      </GlassCard>
    </div>
  )
}
