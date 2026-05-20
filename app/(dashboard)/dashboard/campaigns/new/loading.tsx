import React from 'react'

export default function NewCampaignLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-4 w-36 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="h-10 w-56 rounded-lg bg-slate-200 animate-pulse" />
      <div className="rounded-xl border border-slate-200 bg-white/70 shadow-glass backdrop-blur-xl p-6 space-y-6">
        <div className="space-y-4">
          <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-slate-100 animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-slate-100 animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
          <div className="h-32 w-full rounded-md bg-slate-100 animate-pulse" />
        </div>
        <div className="flex justify-end">
          <div className="h-10 w-40 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
