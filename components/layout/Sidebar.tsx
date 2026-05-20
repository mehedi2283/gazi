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
import useCurrentUser from '../../hooks/useCurrentUser'

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
  const { isAdmin } = useCurrentUser()
  const navItems = NAV

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative z-10 flex h-full flex-col">
      <div className="mb-8 flex flex-col items-center gap-1 px-1 text-center">
        <div className="w-full">
          <div className="h-16 w-full flex items-center justify-center overflow-hidden px-2">
            <img src="/Final_Logo_GazI.svg" alt="Gazi logo" className="w-full h-full object-contain" />
          </div>
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight text-gradient-accent">GaziAI Buyer Discovery</div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Outbound</p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
            {isAdmin ? 'Admin' : 'User'}
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
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

        {isAdmin ? (
          <div className="mt-4 border-t border-slate-200/60 pt-4">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Administration
            </div>
            <MotionLink
              href="/dashboard/users"
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname.startsWith('/dashboard/users')
                  ? 'border border-violet-200 bg-violet-50 text-violet-700 font-semibold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              {pathname.startsWith('/dashboard/users') ? (
                <motion.span
                  layoutId="sidebar-active-users-primary"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/12 via-sky-500/6 to-transparent ring-1 ring-violet-500/15"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-md ${
                  pathname.startsWith('/dashboard/users')
                    ? 'bg-gradient-to-br from-violet-500 to-sky-500 text-white shadow-md shadow-violet-500/20'
                    : 'bg-violet-50 text-violet-500 group-hover:bg-violet-100 group-hover:text-violet-600'
                }`}
              >
                <Users className="h-4 w-4" aria-hidden />
              </span>
              <span className="relative z-10 flex flex-1 items-center justify-between">
                <span>Users</span>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-500">
                  Admin
                </span>
              </span>
            </MotionLink>
          </div>
        ) : null}
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
