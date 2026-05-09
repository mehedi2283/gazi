import React from 'react'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-white">
      <div className="text-lg font-semibold">Overview</div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/campaigns/new" className="rounded bg-indigo-600 px-3 py-1 text-white">
          New Campaign
        </Link>
      </div>
    </header>
  )
}
