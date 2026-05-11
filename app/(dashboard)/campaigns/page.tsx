"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import useCampaigns from '../../../hooks/useCampaigns'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, Pause, Play, MoreVertical, Pencil, Trash } from 'lucide-react'
import Modal from '../../../components/ui/Modal'

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
  const [copyFor, setCopyFor] = useState<string | null>(null)
  const [copyName, setCopyName] = useState<string>('')
  const [copyLoading, setCopyLoading] = useState(false)
  const [menuAboveFor, setMenuAboveFor] = useState<string | null>(null)
  const [copyModalFor, setCopyModalFor] = useState<any | null>(null)
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

  const campaignCopyPayload = useMemo(() => (campaign: any) => ({
    name: `${campaign.name} (Copy)`,
    organization_id: campaign.organization_id || null,
    daily_limit: campaign.daily_limit ?? 50,
    email_gap: campaign.email_gap ?? 10,
    stop_on_reply: campaign.stop_on_reply ?? true,
    open_tracking: campaign.open_tracking ?? false,
    link_tracking: campaign.link_tracking ?? true,
    campaign_schedule: {
      schedules: [
        {
          name: 'Default Schedule',
          timezone: campaign.timezone || 'Etc/GMT+12',
          timing: {
            from: campaign.from_time || '09:00',
            to: campaign.to_time || '17:00'
          },
          days: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false
          }
        }
      ]
    },
    sequences: Array.isArray(campaign.sequences) && campaign.sequences.length
      ? campaign.sequences.map((sequence: any, index: number) => ({
          step_number: index + 1,
          delay_days: index === 0 ? 0 : Number(sequence.delay_days || index),
          subject_variable: sequence.subject_variable || `{{custom_subject_${index + 1}}}`,
          body_variable: sequence.body_variable || `{{personalization_${index + 1}}}`
        }))
      : [{ step_number: 1, delay_days: 0, subject_variable: '{{custom_subject_1}}', body_variable: '{{personalization_1}}' }]
  }), [])

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
      
      <Modal open={Boolean(copyModalFor)} title="Duplicate campaign" onClose={() => setCopyModalFor(null)}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New campaign name</label>
            <input
              value={copyName}
              onChange={(e) => setCopyName(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button className="rounded border px-3 py-1" onClick={() => setCopyModalFor(null)}>Cancel</button>
            <button
              className="rounded bg-indigo-600 px-3 py-1 text-white"
              disabled={!copyName.trim()}
              onClick={async () => {
                try {
                  setCopyLoading(true)
                  const body = { ...campaignCopyPayload(copyModalFor), name: copyName }
                  const resp = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                  const json = await resp.json()
                  if (!resp.ok || json.error) throw new Error(json.error || 'Copy failed')
                  qc.invalidateQueries({ queryKey: ['campaigns'] })
                  setCopyModalFor(null)
                  setCopyName('')
                } catch (err) {
                  alert(String(err))
                } finally { setCopyLoading(false) }
              }}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(deleteModalFor)} title="Delete campaign" onClose={() => setDeleteModalFor(null)}>
        <div className="space-y-4">
          <p>Are you sure you want to delete the campaign <strong>{deleteModalFor?.name}</strong>? This action cannot be undone.</p>
          <div className="flex items-center justify-end gap-2">
            <button className="rounded border px-3 py-1" onClick={() => setDeleteModalFor(null)}>Cancel</button>
            <button
              className="rounded bg-red-600 px-3 py-1 text-white"
              onClick={async () => {
                try {
                  const resp = await fetch(`/api/campaigns/${deleteModalFor.id}`, { method: 'DELETE' })
                  const json = await resp.json()
                  if (!resp.ok || json.error) throw new Error(json.error || 'Delete failed')
                  qc.invalidateQueries({ queryKey: ['campaigns'] })
                  setDeleteModalFor(null)
                } catch (err) {
                  alert(String(err))
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

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
          <div className="relative rounded-xl overflow-visible">
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
                {data.map((campaign: any) => {
                  const currentStatus = String(campaign.status || 'draft')
                  const canActivate = currentStatus === 'draft' || currentStatus === 'paused' || currentStatus === 'error'
                  const canPause = currentStatus === 'active'
                  const canEdit = Boolean(campaign.id)

                  return (
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
                      <div className="relative inline-block text-left" data-campaign-actions>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            const btn = event.currentTarget as HTMLElement
                            const rect = btn.getBoundingClientRect()
                            const needAbove = (window.innerHeight - rect.bottom) < 220
                            setOpenMenuFor(openMenuFor === campaign.id ? null : campaign.id)
                            setMenuAboveFor(needAbove ? campaign.id : null)
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          aria-label="Open campaign actions"
                        >
                          <MoreVertical className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {openMenuFor === campaign.id ? (
                          <div className={`absolute right-0 ${menuAboveFor === campaign.id ? 'bottom-11' : 'top-11'} z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg`}>
                            {canActivate ? (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
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
                                <Play className="h-4 w-4" />
                                Activate / Resume
                              </button>
                            ) : null}

                            {canPause ? (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
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
                                <Pause className="h-4 w-4" />
                                Pause
                              </button>
                            ) : null}

                            {canEdit ? (
                              <Link
                                href={`/dashboard/campaigns/${campaign.id}/edit`}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                                onClick={() => setOpenMenuFor(null)}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit Campaign
                              </Link>
                            ) : null}

                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuFor(null)
                                setCopyModalFor(campaign)
                                setCopyName(`${campaign.name} (Copy)`)
                              }}
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>

                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                              onClick={(e) => { e.stopPropagation(); setOpenMenuFor(null); setDeleteModalFor(campaign) }}
                            >
                              <Trash className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  )
                })}
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
