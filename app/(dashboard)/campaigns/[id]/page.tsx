import React from 'react'

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Campaign Details</h1>
      <div className="rounded-xl bg-white p-6 shadow">
        <p className="text-slate-600">Campaign ID: {params.id}</p>
      </div>
    </div>
  )
}
