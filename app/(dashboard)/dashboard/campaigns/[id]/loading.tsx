import React from 'react'

export default function CampaignDetailLoading() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4">
          <div className="h-4 w-36 rounded bg-slate-200 animate-pulse" />
          <div className="h-10 w-64 rounded-lg bg-slate-200 animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-slate-200 animate-pulse" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white/70 shadow-glass backdrop-blur-xl overflow-hidden">
        <div className="border-b border-slate-200/65 bg-white/40 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 w-full rounded-md bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
