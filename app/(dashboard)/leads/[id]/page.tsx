import React from 'react'

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lead Details</h1>
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-slate-600">Lead ID: {params.id}</p>
      </div>
    </div>
  )
}
