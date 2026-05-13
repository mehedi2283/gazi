'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Sidebar() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="space-y-2">
      <div className="text-xl font-bold mb-4">LeadGen AI</div>
      <ul className="space-y-1">
        <li><Link href="/dashboard" className="block px-3 py-2 rounded hover:bg-indigo-600">Dashboard</Link></li>
        <li><Link href="/dashboard/leads" className="block px-3 py-2 rounded hover:bg-indigo-600">Leads</Link></li>
        <li><Link href="/dashboard/campaigns" className="block px-3 py-2 rounded hover:bg-indigo-600">Campaigns</Link></li>
      </ul>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 block w-full rounded px-3 py-2 text-left hover:bg-indigo-600"
      >
        Logout
      </button>
    </nav>
  )
}
