import React from 'react'
import { TableRowSkeleton } from '../../../../components/ui/Skeleton'

export default function CampaignsLoading() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-end">
        <div className="h-10 w-36 rounded-lg bg-slate-200 animate-pulse" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white/70 shadow-glass backdrop-blur-xl overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/10 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-64 rounded-lg bg-slate-100 animate-pulse" />
              <div className="h-9 w-36 rounded-lg bg-slate-100 animate-pulse" />
            </div>
          </div>
        </div>
        <TableRowSkeleton rows={6} />
      </div>
    </div>
  )
}
