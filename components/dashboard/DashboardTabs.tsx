'use client'

import React, { useState } from 'react'
import InstantlyDashboard from './InstantlyDashboard'

interface DashboardTabsProps {
  children: React.ReactNode
}

export default function DashboardTabs({ children }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'instantly'>('overview')

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('instantly')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            activeTab === 'instantly'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Instantly Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <div>{children}</div>}
        {activeTab === 'instantly' && <InstantlyDashboard />}
      </div>
    </div>
  )
}
