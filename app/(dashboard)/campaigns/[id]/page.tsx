import React from 'react'

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Campaign Details</h1>
      <div className="rounded-xl bg-white p-6 shadow">
        <p className="text-slate-600">Campaign ID: {params.id}</p>
        <p className="mt-3 text-slate-600">No leads yet or leads are generating, please wait.</p>
      </div>
    </div>
  )
}
