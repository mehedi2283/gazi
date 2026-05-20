import React from 'react'

export default function UsersLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-xl border border-slate-200 bg-white/70 px-5 py-4 shadow-glass backdrop-blur-xl">
        <div className="h-3 w-24 rounded bg-slate-200 animate-pulse mb-2" />
        <div className="h-8 w-20 rounded bg-slate-200 animate-pulse mb-1" />
        <div className="h-4 w-64 rounded bg-slate-100 animate-pulse" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-slate-200 animate-pulse" />
            <div>
              <div className="h-6 w-32 rounded bg-slate-200 animate-pulse mb-1" />
              <div className="h-4 w-44 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 w-full rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-slate-200 animate-pulse" />
            <div>
              <div className="h-6 w-24 rounded bg-slate-200 animate-pulse mb-1" />
              <div className="h-4 w-52 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-10 w-full rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-10 w-36 rounded-lg bg-slate-200 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
