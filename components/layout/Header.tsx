'use client'

import React, { useMemo } from 'react'
import { usePathname } from 'next/navigation'

function titleForPath(path: string): { title: string; subtitle?: string } {
  if (path.startsWith('/dashboard/campaigns/new') || path.startsWith('/campaigns/new')) {
    return { title: 'New campaign', subtitle: 'Configure sequence, leads, and sending window.' }
  }
  if (path.match(/^\/(dashboard\/)?campaigns\/[^/]+\/edit/)) {
    return { title: 'Edit campaign', subtitle: 'Update settings and launch behavior.' }
  }
  if (
    (path.startsWith('/dashboard/campaigns/') || path.startsWith('/campaigns/')) &&
    !path.endsWith('/campaigns') &&
    !path.endsWith('/campaigns/')
  ) {
    if (!path.includes('/new')) {
      return { title: 'Campaign', subtitle: 'Leads and performance for this campaign.' }
    }
  }
  if (path.startsWith('/dashboard/leads/') || path.startsWith('/leads/')) {
    return { title: 'Lead detail', subtitle: 'Contact record and activity.' }
  }

  const map: Record<string, { title: string; subtitle?: string }> = {
    '/dashboard': {
      title: 'Dashboard',
      subtitle: 'Pipeline health, engagement, and recent activity.'
    },
    '/dashboard/leads': {
      title: 'Leads',
      subtitle: 'Imported contacts and campaign associations.'
    },
    '/dashboard/campaigns': {
      title: 'Campaigns',
      subtitle: 'Sequences synced with Instantly.'
    },
    '/dashboard/ai-personalization': {
      title: 'AI personalization',
      subtitle: 'Bulk copy and messaging tailored by AI.'
    },
    '/dashboard/settings': {
      title: 'Settings',
      subtitle: 'Workspace and account preferences.'
    },
    '/leads': {
      title: 'Leads',
      subtitle: 'Imported contacts and campaign associations.'
    },
    '/campaigns': {
      title: 'Campaigns',
      subtitle: 'Sequences synced with Instantly.'
    },
    '/ai-personalization': {
      title: 'AI personalization',
      subtitle: 'Bulk copy and messaging tailored by AI.'
    },
    '/settings': {
      title: 'Settings',
      subtitle: 'Workspace and account preferences.'
    }
  }

  const normalized = path.replace(/\/$/, '') || '/dashboard'
  return map[normalized] || { title: 'Workspace', subtitle: undefined }
}

export default function Header() {
  const pathname = usePathname() || ''
  const { title, subtitle } = useMemo(() => titleForPath(pathname), [pathname])

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/50 bg-white/70 px-5 py-4 backdrop-blur-xl md:px-8">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold tracking-tight text-slate-800 md:text-2xl">{title}</h1>
        {subtitle ? <p className="max-w-2xl text-sm text-slate-500">{subtitle}</p> : null}
      </div>
    </header>
  )
}
