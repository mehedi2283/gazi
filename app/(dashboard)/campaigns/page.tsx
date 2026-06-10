"use client"

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import useCampaigns from '../../../hooks/useCampaigns'
import { useQueryClient } from '@tanstack/react-query'
import DateRangePicker from '../../../components/ui/DateRangePicker'
import { Calendar, ChevronDown, Layers3, Loader2, Mail, MoreVertical, Pause, Play, Trash, Users } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { TableRowSkeleton } from '../../../components/ui/Skeleton'
import useCurrentUser from '../../../hooks/useCurrentUser'

function statusStyles(status: string) {
  const norm = status ? status.toLowerCase() : 'draft'
  switch (norm) {
    case 'active':
      return 'border border-emerald-500/20 bg-emerald-50 text-emerald-700'
    case 'paused':
      return 'border border-amber-500/20 bg-amber-50 text-amber-700'
    case 'completed':
      return 'border border-blue-500/20 bg-blue-50 text-blue-700'
    default:
      return 'border border-slate-300 bg-slate-100 text-slate-750'
  }
}

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 382 382"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4f46e5"
        d="M347.445,0H34.555C15.471,0,0,15.471,0,34.555v312.889C0,366.529,15.471,382,34.555,382h312.889 C366.529,382,382,366.529,382,347.444V34.555C382,15.471,366.529,0,347.445,0z M118.207,329.844c0,5.554-4.502,10.056-10.056,10.056 H65.345c-5.554,0-10.056-4.502-10.056-10.056V150.403c0-5.554,4.502-10.056,10.056-10.056h42.806 c5.554,0,10.056,4.502,10.056,10.056V329.844z M86.748,123.432c-22.459,0-40.666-18.207-40.666-40.666S64.289,42.1,86.748,42.1 s40.666,18.207,40.666,40.666S109.208,123.432,86.748,123.432z M341.91,330.654c0,5.106-4.14,9.246-9.246,9.246H286.73 c-5.106,0-9.246-4.14-9.246-9.246v-84.168c0-12.556,3.683-55.021-32.813-55.021c-28.309,0-34.051,29.066-35.204,42.11v97.079 c0,5.106-4.139,9.246-9.246,9.246h-44.426c-5.106,0-9.246-4.14-9.246-9.246V149.593c0-5.106,4.14-9.246,9.246-9.246h44.426 c5.106,0,9.246,4.14,9.246,9.246v15.655c10.497-15.753,26.097-27.912,59.312-27.912c73.552,0,73.131,68.716,73.131,106.472 L341.91,330.654L341.91,330.654z"
      />
    </svg>
  )
}

const CREATE_CAMPAIGN_OPTIONS = [
  {
    href: '/dashboard/campaigns/new?channel=email',
    label: 'Email outreach',
    description: 'Current email outreach',
    icon: Mail
  },
  {
    href: '/dashboard/campaigns/new?channel=linkedin',
    label: 'LinkedIn campaign',
    description: 'LinkedIn outreach',
    icon: LinkedInIcon
  },
  {
    href: '/dashboard/campaigns/new?channel=both',
    label: 'Email + LinkedIn',
    description: 'Combined campaign',
    icon: Layers3
  }
]

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const { data, meta, isLoading, error } = useCampaigns(page, perPage, searchQuery, startDate, endDate)
  const { isAdmin } = useCurrentUser()
  const qc = useQueryClient()
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null)
  const [menuAboveFor, setMenuAboveFor] = useState<string | null>(null)
  const [deleteModalFor, setDeleteModalFor] = useState<any | null>(null)
  const [deletingCampaign, setDeletingCampaign] = useState(false)
  const [activatingCampaignId, setActivatingCampaignId] = useState('')
  const [pausingCampaignId, setPausingCampaignId] = useState('')
  const [sendingWeeklyReportCampaignId, setSendingWeeklyReportCampaignId] = useState('')
  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (target && !target.closest('[data-campaign-actions]')) {
        setOpenMenuFor(null)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])



  const filteredCampaigns = data || []
  const totalCampaigns = meta?.total ?? filteredCampaigns.length
  const totalPages = Math.max(1, Math.ceil(totalCampaigns / perPage))
  const paginatedCampaigns = filteredCampaigns

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [startDate, endDate])

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Action Bar */}
      <div className="flex justify-end">
        <div className="group relative inline-flex" data-campaign-create-menu>
          <button
            type="button"
            aria-haspopup="menu"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-600/10 transition hover:opacity-95 hover:shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            Create campaign
            <ChevronDown className="h-4 w-4 text-white/85 transition group-hover:rotate-180" />
          </button>

          <div className="invisible absolute right-0 top-full z-30 mt-2 w-64 translate-y-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
            {CREATE_CAMPAIGN_OPTIONS.map((option) => {
              const Icon = option.icon

              return (
                <Link
                  key={option.href}
                  href={option.href}
                  className="flex items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-indigo-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-800">{option.label}</span>
                    <span className="block truncate text-xs font-medium text-slate-500">{option.description}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <Modal open={Boolean(deleteModalFor)} title="Delete campaign" onClose={() => setDeleteModalFor(null)}>
        <div className="space-y-4">
          <p className="text-slate-600 font-medium">
            Are you sure you want to delete the campaign <strong className="text-slate-800 font-bold">{deleteModalFor?.name}</strong>? This
            action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={deletingCampaign}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setDeleteModalFor(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingCampaign}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              onClick={async () => {
                setDeletingCampaign(true)
                try {
                  const leadsResponse = await fetch(`/api/leads?campaign_id=${deleteModalFor.id}&export=1`)
                  const leadsJson = await leadsResponse.json()

                  if (!leadsResponse.ok || leadsJson.error) {
                    throw new Error(leadsJson.error?.message || leadsJson.error || 'Failed to load related leads')
                  }

                  const relatedLeads = Array.isArray(leadsJson.data) ? leadsJson.data : []
                  if (relatedLeads.length > 0) {
                    downloadCsv(`campaign-${deleteModalFor.id}-leads.csv`, relatedLeads)
                  }

                  const resp = await fetch(`/api/campaigns/${deleteModalFor.id}`, { method: 'DELETE' })
                  const json = await resp.json()
                  if (!resp.ok || json.error) throw new Error(json.error || 'Delete failed')
                  qc.invalidateQueries({ queryKey: ['campaigns'] })
                  setDeleteModalFor(null)
                  toast.success('Campaign deleted')
                } catch (err) {
                  toast.error(String(err))
                } finally {
                  setDeletingCampaign(false)
                }
              }}
            >
              {deletingCampaign ? (
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

      {/* Main Table Section */}
      <div className="rounded-xl border border-slate-200 bg-white/70 shadow-glass backdrop-blur-xl overflow-visible">
        <div className="border-b border-slate-100 bg-slate-50/10 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Active Sequences
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="flex min-w-[280px] flex-1 cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm ring-indigo-500/20 transition-all focus-within:ring-2"
                role="button"
                tabIndex={-1}
                onClick={() => searchInputRef.current?.focus()}
              >
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full border-0 bg-transparent p-0 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-0"
                  placeholder="Search campaigns..."
                />
              </div>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start)
                  setEndDate(end)
                }}
                onClear={() => {
                  setStartDate('')
                  setEndDate('')
                }}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <TableRowSkeleton rows={6} />
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-red-500">Failed to load campaigns.</p>
          </div>
        ) : filteredCampaigns.length ? (
          <>
          <div className="overflow-x-auto overflow-y-visible min-h-[240px]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Campaign</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Company</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Creator</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCampaigns.map((campaign: any) => {
                  const currentStatus = String(campaign.status || 'draft')
                  const channel = String(campaign.channel || campaign.campaign_type || 'email_outreach')
                  const isLinkedInCampaign = channel === 'linkedin_outreach' || channel === 'linkedin'
                  const canActivate = currentStatus === 'draft' || currentStatus === 'paused' || currentStatus === 'error'
                  const canPause = currentStatus === 'active'
                  const canSendWeeklyReport = isAdmin && currentStatus !== 'draft'

                  return (
                    <tr key={campaign.id} className="group transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-800 text-base">{campaign.name}</span>
                            <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isLinkedInCampaign
                                ? 'border-indigo-500/20 bg-indigo-50 text-indigo-700'
                                : 'border-slate-300 bg-slate-100 text-slate-600'
                            }`}>
                              {isLinkedInCampaign ? 'LinkedIn' : 'Email'}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                            <div className="text-xs text-slate-400">Created {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : '—'}</div>
                            {campaign.instantly_campaign_id && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-slate-300 sm:ml-2" />
                                <span className="text-[10px] font-mono text-slate-400 sm:ml-2">ID: {String(campaign.instantly_campaign_id).slice(0, 8)}...</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-slate-700">{campaign.company_name || '—'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-slate-700">{campaign.created_from_company || '—'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles(campaign.status)}`}>
                          {campaign.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-3" data-campaign-actions>
                          <div className="flex items-center gap-3">
                              {/* Lead Count Badge */}
                              <span 
                                title={`${campaign.total_leads || 0} total leads`}
                                className="flex h-7 px-2.5 flex-none items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-bold text-indigo-600 ring-1 ring-indigo-500/20 gap-1"
                              >
                                <Users className="h-3.5 w-3.5" />
                                <span>{campaign.total_leads || 0}</span>
                              </span>

                              {/* Booking Count Badge */}
                              <span 
                                title={`${campaign.total_booking_count || 0} total bookings`}
                                className="flex h-7 px-2.5 flex-none items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-500/20 gap-1"
                              >
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{campaign.total_booking_count || 0}</span>
                              </span>

                              <Link
                                href={`/dashboard/campaigns/${campaign.id}`}
                                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                              >
                                View leads
                              </Link>
                            </div>

                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                const btn = event.currentTarget as HTMLElement
                                const rect = btn.getBoundingClientRect()
                                const needAbove = window.innerHeight - rect.bottom < 260
                                setOpenMenuFor(openMenuFor === campaign.id ? null : campaign.id)
                                setMenuAboveFor(needAbove ? campaign.id : null)
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-750 shadow-sm"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openMenuFor === campaign.id ? (
                              <div
                                className={`absolute right-0 z-20 w-48 overflow-hidden rounded-lg border border-slate-200/80 bg-white/95 py-1 shadow-xl backdrop-blur-xl ${
                                  menuAboveFor === campaign.id ? 'bottom-11' : 'top-11'
                                }`}
                              >
                                {canActivate ? (
                                  <button
                                    type="button"
                                    disabled={activatingCampaignId === campaign.id}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-750 transition hover:bg-slate-50 disabled:opacity-50"
                                    onClick={async () => {
                                      setActivatingCampaignId(campaign.id)
                                      try {
                                        const resp = await fetch(`/api/campaigns/${campaign.id}/activate`, { method: 'POST' })
                                        const json = await resp.json()
                                        if (!resp.ok || json.error) throw new Error(json.error || 'Activate failed')
                                        qc.invalidateQueries({ queryKey: ['campaigns'] })
                                        setOpenMenuFor(null)
                                        toast.success('Campaign activated')
                                      } catch (e) {
                                        toast.error(String(e))
                                      } finally {
                                        setActivatingCampaignId('')
                                      }
                                    }}
                                  >
                                    {activatingCampaignId === campaign.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                    {activatingCampaignId === campaign.id ? 'Activating...' : 'Activate / Resume'}
                                  </button>
                                ) : null}

                                {canPause ? (
                                  <button
                                    type="button"
                                    disabled={pausingCampaignId === campaign.id}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-750 transition hover:bg-slate-50 disabled:opacity-50"
                                    onClick={async () => {
                                      setPausingCampaignId(campaign.id)
                                      try {
                                        const resp = await fetch(`/api/campaigns/${campaign.id}/pause`, { method: 'POST' })
                                        const json = await resp.json()
                                        if (!resp.ok || json.error) throw new Error(json.error || 'Pause failed')
                                        qc.invalidateQueries({ queryKey: ['campaigns'] })
                                        setOpenMenuFor(null)
                                        toast.success('Campaign paused')
                                      } catch (e) {
                                        toast.error(String(e))
                                      } finally {
                                        setPausingCampaignId('')
                                      }
                                    }}
                                  >
                                    {pausingCampaignId === campaign.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Pause className="h-4 w-4" />
                                    )}
                                    {pausingCampaignId === campaign.id ? 'Pausing...' : 'Pause'}
                                  </button>
                                ) : null}

                                {canSendWeeklyReport ? (
                                  <button
                                    type="button"
                                    disabled={sendingWeeklyReportCampaignId === campaign.id || !campaign.instantly_campaign_id}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-750 transition hover:bg-slate-50 disabled:opacity-50"
                                    onClick={async () => {
                                      setSendingWeeklyReportCampaignId(campaign.id)
                                      try {
                                        const resp = await fetch(`/api/campaigns/${campaign.id}/weekly-report`, { method: 'POST' })
                                        const json = await resp.json()
                                        if (!resp.ok || json.error) throw new Error(json.error || 'Weekly report failed')
                                        setOpenMenuFor(null)
                                        toast.success('Weekly report sent')
                                      } catch (e) {
                                        toast.error(String(e))
                                      } finally {
                                        setSendingWeeklyReportCampaignId('')
                                      }
                                    }}
                                  >
                                    {sendingWeeklyReportCampaignId === campaign.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Calendar className="h-4 w-4" />
                                    )}
                                    {sendingWeeklyReportCampaignId === campaign.id ? 'Sending report...' : 'Send weekly report'}
                                  </button>
                                ) : null}

                                {isAdmin ? (
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenMenuFor(null)
                                      setDeleteModalFor(campaign)
                                    }}
                                  >
                                    <Trash className="h-4 w-4" />
                                    Delete
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
            <span className="text-xs text-slate-400">
              Showing {Math.min((page - 1) * perPage + 1, totalCampaigns)}–{Math.min(page * perPage, totalCampaigns)} of {totalCampaigns}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 shadow-sm"
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
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
          </>
        ) : (
          <div className="p-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
              <Play className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No campaigns yet</h3>
            <p className="mt-1 text-sm text-slate-400">Launch your first outreach sequence to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
