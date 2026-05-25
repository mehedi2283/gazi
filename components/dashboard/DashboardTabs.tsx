'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import InstantlyDashboard from './InstantlyDashboard'

interface DashboardTabsProps {
  children: React.ReactNode
}

export default function DashboardTabs({ children }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'instantly'>('overview')

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'instantly' as const, label: 'Analytics' }
  ]

  return (
    <div>
      <div className="relative mb-8 flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="dashboard-tab-indicator"
                  className="absolute inset-x-1 bottom-0 h-0.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              ) : null}
              <span className="relative z-10">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div>{activeTab === 'overview' ? <div>{children}</div> : null}</div>
      {activeTab === 'instantly' ? <InstantlyDashboard /> : null}
    </div>
  )
}
