import React from 'react'
import { StatCardSkeleton, Skeleton } from '../../components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 h-[400px]">
          <Skeleton className="h-6 w-48 mb-6" />
          <Skeleton className="h-full w-full opacity-40" />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 h-[400px]">
          <Skeleton className="h-6 w-48 mb-6" />
          <Skeleton className="h-full w-full opacity-40" />
        </div>
      </div>
    </div>
  )
}
