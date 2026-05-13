import React from 'react'
import Link from 'next/link'

export default function Sidebar() {
  return (
    <nav className="space-y-2">
      <div className="text-xl font-bold mb-4">LeadGen AI</div>
      <ul className="space-y-1">
        <li><Link href="/dashboard" className="block px-3 py-2 rounded hover:bg-indigo-600">Dashboard</Link></li>
        <li><Link href="/dashboard/leads" className="block px-3 py-2 rounded hover:bg-indigo-600">Leads</Link></li>
        <li><Link href="/dashboard/campaigns" className="block px-3 py-2 rounded hover:bg-indigo-600">Campaigns</Link></li>
      </ul>
    </nav>
  )
}
