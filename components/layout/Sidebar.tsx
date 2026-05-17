'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Sparkles,
  Settings,
  LogOut,
  Zap,
  type LucideIcon
} from 'lucide-react'

const MotionLink = motion(Link)

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone }
]

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href || pathname === `${href}/`
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname() || ''

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative z-10 flex h-full flex-col">
      <div className="mb-8 flex items-center gap-2 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
          <Zap className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight text-gradient-accent">LeadGen AI</div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Outbound</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href, item.exact)
          const Icon = item.icon

          return (
            <MotionLink
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'text-indigo-600 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              {active ? (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/8 via-sky-500/4 to-transparent ring-1 ring-indigo-500/10"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-md ${
                  active
                    ? 'bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200/50 group-hover:text-slate-650'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="relative z-10">{item.label}</span>
            </MotionLink>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-slate-200/50 pt-4">
        <motion.button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-400 group-hover:text-red-500">
            <LogOut className="h-4 w-4" aria-hidden />
          </span>
          Logout
        </motion.button>
      </div>
    </div>
  )
}
