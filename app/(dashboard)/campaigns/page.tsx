"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import useCampaigns from '../../../hooks/useCampaigns'
import { useQueryClient } from '@tanstack/react-query'

function statusStyles(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700'
    case 'paused':
      return 'bg-amber-100 text-amber-700'
    case 'completed':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export default function CampaignsPage() {
  const { data, isLoading, error } = useCampaigns()
  const qc = useQueryClient()
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-slate-500">View and manage campaigns created from the dashboard.</p>
        </div>
        <Link href="/dashboard/campaigns/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-white">
          New Campaign
        </Link>
      </div>

      <div className="rounded-xl bg-white shadow">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">
            Failed to load campaigns.
          </div>
        ) : data?.length ? (
          <div className="overflow-hidden rounded-xl">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Instantly ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.map((campaign: any) => (
                  <tr key={campaign.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{campaign.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles(campaign.status)}`}>
                        {campaign.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{campaign.instantly_campaign_id || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {campaign.created_at ? new Date(campaign.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right relative">
                      <button
                        onClick={() => setOpenMenuFor(openMenuFor === campaign.id ? null : campaign.id)}
                        className="rounded bg-slate-100 px-3 py-1 text-sm"
                      >
                        Actions
                      </button>
                      {openMenuFor === campaign.id ? (
                        <div className="absolute right-3 top-10 z-10 w-40 rounded border bg-white shadow">
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-slate-50"
                            onClick={async () => {
                              try {
                                const resp = await fetch(`/api/campaigns/${campaign.id}/activate`, { method: 'POST' })
                                const json = await resp.json()
                                if (!resp.ok || json.error) throw new Error(json.error || 'Activate failed')
                                qc.invalidateQueries({ queryKey: ['campaigns'] })
                                setOpenMenuFor(null)
                              } catch (e) {
                                alert(String(e))
                              }
                            }}
                          >
                            Activate / Resume
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-slate-50"
                            onClick={async () => {
                              try {
                                const resp = await fetch(`/api/campaigns/${campaign.id}/pause`, { method: 'POST' })
                                const json = await resp.json()
                                if (!resp.ok || json.error) throw new Error(json.error || 'Pause failed')
                                qc.invalidateQueries({ queryKey: ['campaigns'] })
                                setOpenMenuFor(null)
                              } catch (e) {
                                alert(String(e))
                              }
                            }}
                          >
                            Pause
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-slate-50"
                            onClick={async () => {
                              try {
                                const body = {
                                  name: `Copy of ${campaign.name}`,
                                  organization_id: campaign.organization_id || null,
                                  daily_limit: campaign.daily_limit,
                                  email_gap: campaign.email_gap,
                                  stop_on_reply: campaign.stop_on_reply,
                                  open_tracking: campaign.open_tracking,
                                  link_tracking: campaign.link_tracking,
                                  timezone: campaign.timezone,
                                  from_time: campaign.from_time,
                                  to_time: campaign.to_time
                                }
                                const resp = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                                const json = await resp.json()
                                if (!resp.ok || json.error) throw new Error(json.error || 'Copy failed')
                                qc.invalidateQueries({ queryKey: ['campaigns'] })
                                setOpenMenuFor(null)
                              } catch (e) {
                                alert(String(e))
                              }
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="text-lg font-semibold text-slate-900">No campaigns yet</div>
            <p className="max-w-md text-sm text-slate-500">
              Create your first campaign from the dashboard. Once the Supabase schema is installed, it will show up here.
            </p>
            <Link href="/dashboard/campaigns/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-white">
              Create Campaign
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
