"use client"
import React from 'react'

type Campaign = {
  id: string
  name: string
  status: string
  created_at?: string
}

function statusStyles(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-700'
    case 'paused': return 'bg-amber-100 text-amber-700'
    case 'draft': return 'bg-slate-100 text-slate-700'
    case 'completed': return 'bg-blue-100 text-blue-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

function formatCampaignDate(value?: string) {
  if (!value) return 'Recently created'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently created'

  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()

  return `${month}/${day}/${year}`
}

export default function RecentCampaigns({ data }: { data: Campaign[] }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow min-h-[320px]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Recent Campaigns</h3>
        <p className="text-sm text-slate-500">Latest campaign activity</p>
      </div>

      {!data?.length ? (
        <div className="text-slate-500 py-10 text-center">No campaigns found yet.</div>
      ) : (
        <div className="space-y-3">
          {data.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between rounded-lg border px-3 py-3 hover:bg-slate-50">
              <div>
                <div className="font-medium text-slate-900">{campaign.name}</div>
                <div className="text-xs text-slate-500">{formatCampaignDate(campaign.created_at)}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles(campaign.status)}`}>
                {campaign.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
