"use client"

import React, { useMemo } from 'react'
import useCampaigns from '../../../hooks/useCampaigns'
import useLeads from '../../../hooks/useLeads'
import { TableRowSkeleton } from '../../../components/ui/Skeleton'

function formatName(lead: any) {
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '-'
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

function SourceBadge({ source }: { source: string }) {
  const s = String(source || 'manual').toLowerCase()
  let color = '#3b82f6'
  let textColor = '#60a5fa'

  if (s === 'import') {
    color = '#1d8a48'
    textColor = '#4ade80'
  } else if (s === 'apollo') {
    color = '#ebf212'
    textColor = '#facc15'
  }

  return (
    <span
      className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        backgroundColor: `${color}4D`, // Exactly 30% transparency
        borderColor: `${color}66`,     // ~40% transparency for border
        color: textColor
      }}
    >
      {source || 'manual'}
    </span>
  )
}

export default function LeadsPage() {
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
  const { data: leads, isLoading: leadsLoading, error: leadsError } = useLeads()

  const campaignNameById = useMemo(() => {
    return new Map<string, string>((campaigns || []).map((campaign: any) => [String(campaign.id), String(campaign.name)]))
  }, [campaigns])

  const loading = campaignsLoading || leadsLoading

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">All leads</h2>
            <p className="text-sm text-zinc-500">{leads?.length || 0} leads in Supabase</p>
          </div>
        </div>

        {loading ? (
          <TableRowSkeleton rows={8} />
        ) : leadsError ? (
          <div className="p-6 text-sm text-red-400">Failed to load leads.</div>
        ) : leads?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.06] text-left text-sm">
              <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {leads.map((lead: any) => (
                  <tr key={lead.id} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-medium text-zinc-100">{lead.email}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatName(lead)}</td>
                    <td className="px-4 py-3 text-zinc-400">{lead.company_name || '-'}</td>
                    <td className="px-4 py-3 text-zinc-400">{lead.title || '-'}</td>
                    <td className="px-4 py-3 text-zinc-400">{campaignNameById.get(lead.campaign_id) || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-xl border border-white/10 bg-zinc-800/80 px-3 py-1 text-xs font-semibold text-zinc-300">
                        {lead.status || 'new'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SourceBadge source={lead.source} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="text-lg font-semibold text-zinc-100">No leads yet</div>
            <p className="max-w-md text-sm text-zinc-500">Import a CSV or spreadsheet to populate this table.</p>
          </div>
        )}
      </div>
    </div>
  )
}
