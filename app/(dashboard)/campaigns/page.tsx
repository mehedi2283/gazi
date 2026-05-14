"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import useCampaigns from '../../../hooks/useCampaigns'
import { useQueryClient } from '@tanstack/react-query'
import { Pause, Play, MoreVertical, Trash } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { TableRowSkeleton } from '../../../components/ui/Skeleton'

function statusStyles(status: string) {
  switch (status) {
    case 'active':
      return 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'paused':
      return 'border border-amber-500/30 bg-amber-500/10 text-amber-200'
    case 'completed':
      return 'border border-blue-500/30 bg-blue-500/10 text-blue-200'
    default:
      return 'border border-zinc-600/50 bg-zinc-800/80 text-zinc-300'
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
  const { data, isLoading, error } = useCampaigns()
  const qc = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
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



  const filteredCampaigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return data || []

    return (data || []).filter((campaign: any) => {
      return [campaign.name, campaign.status, campaign.instantly_campaign_id, campaign.organization_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [data, searchQuery])

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Action Bar */}
      <div className="flex justify-end">
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-95"
        >
          New campaign
        </Link>
      </div>

      <Modal open={Boolean(deleteModalFor)} title="Delete campaign" onClose={() => setDeleteModalFor(null)}>
        <div className="space-y-4">
          <p className="text-zinc-300">
            Are you sure you want to delete the campaign <strong className="text-white">{deleteModalFor?.name}</strong>? This
            action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
              onClick={() => setDeleteModalFor(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              onClick={async () => {
                try {
                  const leadsResponse = await fetch(`/api/leads?campaign_id=${deleteModalFor.id}`)
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
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              Active Sequences
            </h2>
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-64 rounded-lg border border-white/10 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-blue-500/30 focus:ring-2 transition-all"
                placeholder="Search campaigns..."
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
            <p className="text-sm text-red-400">Failed to load campaigns.</p>
          </div>
        ) : filteredCampaigns.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/[0.06] bg-white/[0.01]">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Campaign</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredCampaigns.map((campaign: any) => {
                  const currentStatus = String(campaign.status || 'draft')
                  const canActivate = currentStatus === 'draft' || currentStatus === 'paused' || currentStatus === 'error'
                  const canPause = currentStatus === 'active'

                  return (
                    <tr key={campaign.id} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-100 text-base">{campaign.name}</span>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-zinc-500">
                              Created {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : '—'}
                            </span>
                            {campaign.instantly_campaign_id && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                                <span className="text-[10px] font-mono text-zinc-600">
                                  ID: {String(campaign.instantly_campaign_id).slice(0, 8)}...
                                </span>
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
                            <span 
                              title={`${campaign.total_leads || 0} total leads`}
                              className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-blue-500/10 text-[11px] font-bold text-blue-400 ring-1 ring-blue-500/20"
                            >
                              {campaign.total_leads || 0}
                            </span>
                            <Link
                              href={`/dashboard/campaigns/${campaign.id}`}
                              className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/[0.08] hover:text-zinc-100"
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
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/50 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openMenuFor === campaign.id ? (
                              <div
                                className={`absolute right-0 z-20 w-48 overflow-hidden rounded-lg border border-white/10 bg-zinc-950/95 py-1 shadow-2xl backdrop-blur-xl ${
                                  menuAboveFor === campaign.id ? 'bottom-11' : 'top-11'
                                }`}
                              >
                                {canActivate ? (
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/10"
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
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/10"
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

                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMenuFor(null)
                                    setDeleteModalFor(campaign)
                                  }}
                                >
                                  <Trash className="h-4 w-4" />
                                  Delete
                                </button>
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
        ) : (
          <div className="p-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.03] border border-white/10">
              <Play className="h-6 w-6 text-zinc-600" />
            </div>
            <h3 className="text-base font-semibold text-zinc-200">No campaigns yet</h3>
            <p className="mt-1 text-sm text-zinc-500">Launch your first outreach sequence to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
