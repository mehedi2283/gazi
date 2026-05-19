"use client"

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import useCampaigns from '../../../hooks/useCampaigns'
import useLeads from '../../../hooks/useLeads'
import { TableRowSkeleton } from '../../../components/ui/Skeleton'

function formatName(lead: any) {
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '-'
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : '-'
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

function LeadScoreBadge({ score }: { score: string | null | undefined }) {
  const normalized = String(score || 'cold').toLowerCase()

  let bg = 'bg-blue-50'
  let border = 'border-blue-200'
  let text = 'text-blue-700'
  let label = 'Cold'

  if (normalized === 'warm') {
    bg = 'bg-amber-50'
    border = 'border-amber-200'
    text = 'text-amber-700'
    label = 'Warm'
  } else if (normalized === 'hot') {
    bg = 'bg-red-50'
    border = 'border-red-200'
    text = 'text-red-700'
    label = 'Hot'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filterScore, setFilterScore] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns(1, 100)
  const { data: leads, meta, isLoading: leadsLoading, error: leadsError } = useLeads(undefined, page, perPage, {
    search: searchTerm,
    leadScore: filterScore,
    source: filterSource
  })

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
          <div className="flex items-center gap-2">
            <input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
              placeholder="Search name, company, title..."
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
            />
            <select
              value={filterScore}
              onChange={(e) => { setFilterScore(e.target.value); setPage(1) }}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
            >
              <option value="">All scores</option>
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="hot">Hot</option>
            </select>
            <select
              value={filterSource}
              onChange={(e) => { setFilterSource(e.target.value); setPage(1) }}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
            >
              <option value="">All sources</option>
              <option value="manual">Manual</option>
              <option value="import">Import</option>
              <option value="apollo">External</option>
            </select>
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
                  <th className="px-4 py-3 font-semibold text-slate-500">Lead score</th>
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
                    <td className="px-4 py-3 text-slate-600">
                      <span
                        title={lead.title || '-'}
                        className="block max-w-[260px] truncate"
                      >
                        {lead.title || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {(() => {
                        const ids: string[] = (lead.campaign_ids && lead.campaign_ids.length > 0)
                          ? lead.campaign_ids
                          : lead.campaign_id ? [String(lead.campaign_id)] : []

                        if (!ids || ids.length === 0) return '-'

                        const maxVisible = 3
                        const visible = ids.slice(0, maxVisible)
                        const overflow = ids.length - visible.length

                        return (
                          <div className="flex items-center gap-1">
                            {visible.map((id: string) => (
                              <Link
                                key={id}
                                href={`/dashboard/campaigns/${id}?lead=${lead.id}`}
                                className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                              >
                                {campaignNameById.get(id) || 'Unknown'}
                              </Link>
                            ))}

                            {overflow > 0 && (
                              <div className="relative inline-block group">
                                <span tabIndex={0} className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 cursor-pointer">
                                  +{overflow}
                                </span>

                                <div className="absolute left-0 z-50 mt-2 hidden w-max min-w-[160px] rounded-md border bg-white p-2 text-sm text-slate-700 shadow-lg group-hover:block group-focus:block">
                                  <div className="flex flex-col gap-1">
                                    {ids.slice(maxVisible).map((id: string) => (
                                      <Link
                                        key={id}
                                        href={`/dashboard/campaigns/${id}?lead=${lead.id}`}
                                        className="block truncate px-2 py-1 hover:bg-slate-50 rounded"
                                      >
                                        {campaignNameById.get(id) || 'Unknown'}
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <LeadScoreBadge score={lead.lead_score} />
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
