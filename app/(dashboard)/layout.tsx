import React from 'react'
import Sidebar from '../../components/layout/Sidebar'
import Header from '../../components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas text-zinc-100">
      <aside className="relative sticky top-0 z-20 flex h-screen w-[272px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.06] bg-zinc-950/70 p-5 backdrop-blur-2xl">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-[3px] sidebar-gradient-edge opacity-90" aria-hidden />
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
