import React from 'react'
import Sidebar from '../../components/layout/Sidebar'
import Header from '../../components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 sidebar-bg text-white p-4">
        <Sidebar />
      </aside>
      <div className="flex-1 main-bg">
        <Header />
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
