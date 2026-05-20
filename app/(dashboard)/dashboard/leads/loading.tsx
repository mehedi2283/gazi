import React from 'react'
import { TableRowSkeleton } from '../../../../components/ui/Skeleton'

export default function LeadsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/70 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <div className="h-5 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="mt-2 h-4 w-40 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-52 rounded-md bg-slate-100 animate-pulse" />
            <div className="h-9 w-32 rounded-md bg-slate-100 animate-pulse" />
            <div className="h-9 w-32 rounded-md bg-slate-100 animate-pulse" />
          </div>
        </div>
        <TableRowSkeleton rows={8} />
      </div>
    </div>
  )
}
