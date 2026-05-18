"use client"

import React, { useMemo, useState } from 'react'
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
  let bg = 'bg-blue-50'
  let border = 'border-blue-200'
  let text = 'text-blue-700'
  let label = source || 'manual'

  if (s === 'import') {
    bg = 'bg-emerald-50'
    border = 'border-emerald-200'
    text = 'text-emerald-705'
  } else if (s === 'apollo') {
    bg = 'bg-indigo-50'
    border = 'border-indigo-200'
    text = 'text-indigo-700'
    label = 'External'
  }

  return (
    <span className={`inline-flex rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${bg} ${border} ${text}`}>
      {label}
    </span>
  )
}

export default function LeadsPage() {
  const [page, setPage] = useState(1)
  const perPage = 10
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns(1, 100)
  const { data: leads, meta, isLoading: leadsLoading, error: leadsError } = useLeads(undefined, page, perPage)

  const campaignNameById = useMemo(() => {
    return new Map<string, string>((campaigns || []).map((campaign: any) => [String(campaign.id), String(campaign.name)]))
  }, [campaigns])

  const loading = campaignsLoading || leadsLoading

  const totalLeads = meta?.total ?? leads?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(totalLeads / perPage))
  const paginatedLeads = leads || []

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/70 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">All leads</h2>
            <p className="text-sm text-slate-400">{leads?.length || 0} leads in Supabase</p>
          </div>
        </div>

        {loading ? (
          <TableRowSkeleton rows={8} />
        ) : leadsError ? (
          <div className="p-6 text-sm text-red-500">Failed to load leads.</div>
        ) : leads?.length ? (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50/70 text-xs uppercase tracking-wider text-slate-550">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-500">Email</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Company</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Title</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Campaign</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Source</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {paginatedLeads.map((lead: any) => (
                  <tr key={lead.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{lead.email}</td>
                    <td className="px-4 py-3 text-slate-600">{formatName(lead)}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.company_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.title || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {lead.campaign_ids && lead.campaign_ids.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {lead.campaign_ids.map((id: string) => (
                            <span key={id} className="rounded-md bg-slate-150/60 px-2 py-0.5 text-[10px] text-slate-600">
                              {campaignNameById.get(id) || 'Unknown'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        campaignNameById.get(lead.campaign_id) || '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md border border-indigo-100 bg-indigo-50/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        {lead.status || 'new'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SourceBadge source={lead.source} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-400">
              Showing {Math.min((page - 1) * perPage + 1, totalLeads)}–{Math.min(page * perPage, totalLeads)} of {totalLeads}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30"
              >
                Previous
              </button>
              <span className="min-w-[60px] text-center text-xs text-slate-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="text-lg font-semibold text-slate-800 font-semibold">No leads yet</div>
            <p className="max-w-md text-sm text-slate-400">Import a CSV or spreadsheet to populate this table.</p>
          </div>
        )}
      </div>
    </div>
  )
}
