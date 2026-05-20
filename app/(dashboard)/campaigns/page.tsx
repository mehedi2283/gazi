"use client"

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import useCampaigns from '../../../hooks/useCampaigns'
import { useQueryClient } from '@tanstack/react-query'
import { Calendar, Pause, Play, MoreVertical, Trash, Users } from 'lucide-react'
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

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const { data, meta, isLoading, error } = useCampaigns(page, perPage, searchQuery, selectedDate)
  const { isAdmin } = useCurrentUser()
  const qc = useQueryClient()
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null)
  const [menuAboveFor, setMenuAboveFor] = useState<string | null>(null)
  const [deleteModalFor, setDeleteModalFor] = useState<any | null>(null)
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
  }, [selectedDate])

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Action Bar */}
      <div className="flex justify-end">
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/10 transition hover:opacity-95 hover:shadow-indigo-600/20"
        >
          New campaign
        </Link>
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
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setDeleteModalFor(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              onClick={async () => {
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
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Main Table Section */}
      <div className="rounded-xl border border-slate-200 bg-white/70 shadow-glass backdrop-blur-xl overflow-hidden">
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
              <div
                className="relative flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm ring-indigo-500/20 transition-all focus-within:ring-2"
                role="button"
                tabIndex={-1}
                onClick={() => {
                  const picker = dateInputRef.current as HTMLInputElement & { showPicker?: () => void }
                  if (picker?.showPicker) {
                    picker.showPicker()
                  } else {
                    dateInputRef.current?.focus()
                  }
                }}
              >
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-full cursor-pointer appearance-none border-0 bg-transparent py-0 pr-8 text-sm text-slate-700 outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:hidden"
                  aria-label="Filter campaigns by created date"
                />
                <button
                  type="button"
                  className="absolute right-3 cursor-pointer text-slate-400 transition hover:text-slate-600"
                  onClick={() => {
                    const picker = dateInputRef.current as HTMLInputElement & { showPicker?: () => void }
                    if (picker?.showPicker) {
                      picker.showPicker()
                    } else {
                      dateInputRef.current?.focus()
                    }
                  }}
                  aria-label="Open date picker"
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {selectedDate ? (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Clear date
                </button>
              ) : null}
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Campaign</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCampaigns.map((campaign: any) => {
                  const currentStatus = String(campaign.status || 'draft')
                  const canActivate = currentStatus === 'draft' || currentStatus === 'paused' || currentStatus === 'error'
                  const canPause = currentStatus === 'active'

                  return (
                    <tr key={campaign.id} className="group transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-base">{campaign.name}</span>
                          <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                            <div className="text-xs text-slate-400">Created {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : '—'}</div>
                            {campaign.company_name ? (
                              <div className="text-xs text-slate-400 sm:ml-2">• Company: <span className="text-slate-700 font-medium">{campaign.company_name}</span></div>
                            ) : null}
                            {campaign.created_from_company ? (
                              <div className="text-xs text-slate-400 sm:ml-2">• Creator: <span className="text-slate-700 font-medium">{campaign.created_from_company}</span></div>
                            ) : null}
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
                                const needAbove = window.innerHeight - rect.bottom < 220
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
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-750 transition hover:bg-slate-50"
                                    onClick={async () => {
                                      try {
                                        const resp = await fetch(`/api/campaigns/${campaign.id}/activate`, { method: 'POST' })
                                        const json = await resp.json()
                                        if (!resp.ok || json.error) throw new Error(json.error || 'Activate failed')
                                        qc.invalidateQueries({ queryKey: ['campaigns'] })
                                        setOpenMenuFor(null)
                                        toast.success('Campaign activated')
                                      } catch (e) {
                                        toast.error(String(e))
                                      }
                                    }}
                                  >
                                    <Play className="h-4 w-4" />
                                    Activate / Resume
                                  </button>
                                ) : null}

                                {canPause ? (
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-750 transition hover:bg-slate-50"
                                    onClick={async () => {
                                      try {
                                        const resp = await fetch(`/api/campaigns/${campaign.id}/pause`, { method: 'POST' })
                                        const json = await resp.json()
                                        if (!resp.ok || json.error) throw new Error(json.error || 'Pause failed')
                                        qc.invalidateQueries({ queryKey: ['campaigns'] })
                                        setOpenMenuFor(null)
                                        toast.success('Campaign paused')
                                      } catch (e) {
                                        toast.error(String(e))
                                      }
                                    }}
                                  >
                                    <Pause className="h-4 w-4" />
                                    Pause
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
