'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import useCampaigns from '../../../hooks/useCampaigns'
import useLeads from '../../../hooks/useLeads'
import { TableRowSkeleton } from '../../../components/ui/Skeleton'
import useCurrentUser from '../../../hooks/useCurrentUser'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronUp, MoreVertical, Trash2, Loader2 } from 'lucide-react'
import Modal from '../../../components/ui/Modal'

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

function LeadGptScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null || !Number.isFinite(Number(score))) {
    return <span className="text-slate-400">-</span>
  }

  const value = Number(score)
  let style = 'border-blue-200 bg-blue-50 text-blue-700'

  if (value >= 8) {
    style = 'border-emerald-200 bg-emerald-50 text-emerald-700'
  } else if (value >= 4) {
    style = 'border-amber-200 bg-amber-50 text-amber-700'
  } else if (value >= 0) {
    style = 'border-rose-200 bg-rose-50 text-rose-700'
  }

  return (
    <span className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-md border px-2 py-0.5 text-xs font-bold ${style}`}>
      {value}
    </span>
  )
}

function LeadConfidenceScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null || !Number.isFinite(Number(score))) {
    return <span className="text-slate-400">-</span>
  }

  const value = Number(score)
  let style = 'border-blue-200 bg-blue-50 text-blue-700'

  if (value >= 80) {
    style = 'border-emerald-200 bg-emerald-50 text-emerald-700'
  } else if (value >= 50) {
    style = 'border-amber-200 bg-amber-50 text-amber-700'
  } else if (value >= 0) {
    style = 'border-rose-200 bg-rose-50 text-rose-700'
  }

  return (
    <span className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-md border px-2 py-0.5 text-xs font-bold ${style}`}>
      {value}%
    </span>
  )
}

function TempIcon({ temp }: { temp: string }) {
  const t = String(temp || 'cold').toLowerCase()
  let src = '/temp-cold.svg'
  let title = 'Cold'

  if (t === 'hot') {
    src = '/temp-hot.svg'
    title = 'Hot'
  } else if (t === 'warm') {
    src = '/temp-warm.svg'
    title = 'Warm'
  }

  return (
    <img
      src={src}
      alt={title}
      title={title}
      className="h-5 w-5 shrink-0"
    />
  )
}

export default function LeadsPage() {
  const [page, setPage] = useState(1)
  const perPage = 10
  const [searchTerm, setSearchTerm] = useState('')
  const [filterScore, setFilterScore] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterTemp, setFilterTemp] = useState('')
  const { isAdmin, isLoading: userLoading } = useCurrentUser()
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns(1, 100)
  const { data: leads, meta, isLoading: leadsLoading, error: leadsError, refetch } = useLeads(undefined, page, perPage, {
    search: searchTerm,
    leadScore: filterScore,
    source: filterSource,
    leadTemp: filterTemp
  })
  const [deletingLeadId, setDeletingLeadId] = useState('')
  const [deleteModalFor, setDeleteModalFor] = useState<{ id: string; label: string } | null>(null)
  const [deletingFromModal, setDeletingFromModal] = useState(false)
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null)
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [openCampaignDropdownForLead, setOpenCampaignDropdownForLead] = useState<string | null>(null)

  const campaignNameById = useMemo(() => {
    return new Map<string, string>((campaigns || []).map((campaign: any) => [String(campaign.id), String(campaign.name)]))
  }, [campaigns])

  const loading = campaignsLoading || leadsLoading
  const activeFilterCount = [searchTerm, filterScore, filterSource, filterTemp].filter((value) => String(value || '').trim().length > 0).length

  const totalLeads = meta?.total ?? leads?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(totalLeads / perPage))
  const paginatedLeads = leads || []

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (target) {
        if (!target.closest('[data-lead-actions]')) {
          setOpenMenuFor(null)
        }
        if (!target.closest('[data-campaign-overflow]')) {
          setOpenCampaignDropdownForLead(null)
        }
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (userLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-500 shadow-glass">Loading access...</div>
  }

  async function handleDeleteLead(leadId: string, leadLabel: string) {
    if (!isAdmin) return

    setDeletingLeadId(leadId)
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, { method: 'DELETE' })
      const json = await response.json()

      if (!response.ok || json.error) {
        throw new Error(json.error?.message || json.error || 'Failed to delete lead')
      }

      toast.success('Lead deleted')
      await refetch()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete lead')
    } finally {
      setDeletingLeadId('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/70 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">All leads</h2>
            <p className="text-sm text-slate-400">{totalLeads} leads in Supabase</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              <option value="">All lead scores</option>
              <option value="high">High (8-10)</option>
              <option value="medium">Medium (4-7)</option>
              <option value="low">Low (0-3)</option>
              <option value="none">No score</option>
            </select>
            <select
              value={filterTemp}
              onChange={(e) => { setFilterTemp(e.target.value); setPage(1) }}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
            >
              <option value="">All temperatures</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
              <option value="neutral">Neutral</option>
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
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setFilterScore('')
                  setFilterSource('')
                  setFilterTemp('')
                  setPage(1)
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Clear filters ({activeFilterCount})
              </button>
            ) : null}
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
                  <th className="px-4 py-3 font-semibold text-slate-500">Lead score</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Confidence</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Campaign</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Details</th>
                  {isAdmin ? <th className="px-4 py-3 font-semibold text-slate-500 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {paginatedLeads.map((lead: any) => {
                  const leadId = String(lead.id)
                  const isExpanded = expandedLeadId === leadId
                  const isAnyExpanded = expandedLeadId !== null
                  const isBlurry = isAnyExpanded && !isExpanded

                  const temp = String(lead.lead_score || 'cold').toLowerCase()
                  let rowBg = 'bg-white hover:bg-slate-50/50'
                  let expandedBg = 'bg-slate-50/50'

                  if (temp === 'hot') {
                    rowBg = 'bg-rose-50/50 hover:bg-rose-100/50'
                    expandedBg = 'bg-rose-50/30'
                  } else if (temp === 'warm') {
                    rowBg = 'bg-amber-50/60 hover:bg-amber-100/60'
                    expandedBg = 'bg-amber-50/40'
                  } else if (temp === 'cold') {
                    rowBg = 'bg-blue-50/50 hover:bg-blue-100/50'
                    expandedBg = 'bg-blue-50/30'
                  } else if (temp === 'neutral') {
                    rowBg = 'bg-slate-50/70 hover:bg-slate-100/70'
                    expandedBg = 'bg-slate-50/40'
                  }

                  return (
                    <React.Fragment key={lead.id}>
                      <tr className={`transition-all duration-300 ${rowBg} ${isBlurry ? 'blur-[1px] opacity-35 hover:blur-[0.5px] hover:opacity-60' : ''}`}>
                        <td className="px-4 py-2.5 font-semibold text-slate-800">{lead.email}</td>
                        <td className="px-4 py-2.5 text-slate-700">{formatName(lead)}</td>
                        <td className="px-4 py-2.5 text-slate-600">{lead.company_name || '-'}</td>
                        <td className="px-4 py-2.5">
                          <LeadGptScoreBadge score={lead.lead_gpt_score} />
                        </td>
                        <td className="px-4 py-2.5">
                          <LeadConfidenceScoreBadge score={lead.lead_gpt_confidence_score} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {(() => {
                            const ids: string[] = (lead.campaign_ids && lead.campaign_ids.length > 0)
                              ? lead.campaign_ids
                              : lead.campaign_id ? [String(lead.campaign_id)] : []

                            if (!ids || ids.length === 0) return '-'

                            const maxVisible = 2
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

                                {overflow > 0 ? (
                                  <div className="relative inline-block text-left" data-campaign-overflow>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenCampaignDropdownForLead(
                                          openCampaignDropdownForLead === lead.id ? null : lead.id
                                        )
                                      }}
                                      className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition"
                                    >
                                      +{overflow}
                                    </button>
                                    {openCampaignDropdownForLead === lead.id && (
                                      <div className="absolute left-0 mt-1 z-30 w-48 rounded-md border border-slate-200 bg-white/95 py-1 shadow-lg backdrop-blur-sm max-h-48 overflow-y-auto">
                                        {ids.slice(maxVisible).map((id: string) => (
                                          <Link
                                            key={id}
                                            href={`/dashboard/campaigns/${id}?lead=${lead.id}`}
                                            className="block px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                                            onClick={() => setOpenCampaignDropdownForLead(null)}
                                          >
                                            {campaignNameById.get(id) || 'Unknown'}
                                          </Link>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <TempIcon temp={lead.lead_score} />
                            <button
                              type="button"
                              onClick={() => setExpandedLeadId((current) => (current === leadId ? null : leadId))}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              {isExpanded ? 'Hide' : 'View'}
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                        {isAdmin ? (
                          <td className="px-4 py-2.5 text-right" data-lead-actions>
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={() => setOpenMenuFor((current) => current === leadId ? null : leadId)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                                aria-label="Open lead actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {openMenuFor === leadId ? (
                                <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                                  <button
                                    type="button"
                                    className="flex w-full items-center px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                    onClick={() => {
                                      setExpandedLeadId((current) => (current === leadId ? null : leadId))
                                      setOpenMenuFor(null)
                                    }}
                                  >
                                    {isExpanded ? 'Hide details' : 'View details'}
                                  </button>
                                  <button
                                    type="button"
                                    className="flex w-full items-center px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                    onClick={() => {
                                      setDeleteModalFor({ id: String(lead.id), label: lead.email || formatName(lead) })
                                      setOpenMenuFor(null)
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                      </tr>

                      {isExpanded ? (
                        <tr className={`transition-all duration-300 ${expandedBg}`}>
                          <td colSpan={isAdmin ? 8 : 7} className="px-4 py-3">
                            <div className="flex flex-col gap-3 text-xs text-slate-600">
                              <div className="grid gap-3 md:grid-cols-3">
                                <div>
                                  <div className="font-semibold text-slate-700">Title</div>
                                  <div>{lead.title || '-'}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-700">Source</div>
                                  <div><SourceBadge source={lead.source} /></div>
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-700">Created</div>
                                  <div>{formatDate(lead.created_at)}</div>
                                </div>
                              </div>
                              {lead.confidence_reason && (
                                <div className="border-t border-slate-100/80 pt-3">
                                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Confidence Reason</div>
                                  <div className="rounded-lg bg-indigo-50/30 border border-indigo-100/50 p-2.5 text-slate-600 leading-relaxed">
                                    {lead.confidence_reason}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  )
                })}
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
      <Modal
        open={Boolean(deleteModalFor)}
        title="Delete lead"
        onClose={() => !deletingFromModal && setDeleteModalFor(null)}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Delete <strong className="text-slate-800">{deleteModalFor?.label}</strong>? This cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={deletingFromModal}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setDeleteModalFor(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingFromModal}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              onClick={async () => {
                if (!deleteModalFor) return
                const target = deleteModalFor
                setDeletingFromModal(true)
                try {
                  await handleDeleteLead(target.id, target.label)
                  setDeleteModalFor(null)
                } catch (err) {
                  // error already toasted in handleDeleteLead
                } finally {
                  setDeletingFromModal(false)
                }
              }}
            >
              {deletingFromModal ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
