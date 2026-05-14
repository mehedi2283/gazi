"use client"

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, ChevronUp, Download } from 'lucide-react'
import useLeads from '../../../../hooks/useLeads'
import { TableRowSkeleton } from '../../../../components/ui/Skeleton'

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const { data: leads, isLoading, error: leadsQueryError } = useLeads(params.id)
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [campaign, setCampaign] = useState<{ name: string } | null>(null)
  const [campaignLoadState, setCampaignLoadState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [campaignLoadError, setCampaignLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchCampaign = async () => {
      setCampaignLoadState('loading')
      setCampaignLoadError(null)

      try {
        const response = await fetch(`/api/campaigns/${params.id}`)
        const result = await response.json().catch(() => ({}))

        if (cancelled) return

        if (!response.ok) {
          setCampaign(null)
          setCampaignLoadError(typeof result?.error === 'string' ? result.error : 'Unable to load campaign')
          setCampaignLoadState('error')
          return
        }

        if (result?.error && !result?.data) {
          setCampaign(null)
          setCampaignLoadError(String(result.error))
          setCampaignLoadState('error')
          return
        }

        const row = result?.data
        if (!row || typeof row !== 'object') {
          setCampaign(null)
          setCampaignLoadError('Campaign not found')
          setCampaignLoadState('error')
          return
        }

        const rawName = row.name
        const name =
          typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : 'Untitled campaign'

        setCampaign({ name })
        setCampaignLoadState('ok')
      } catch {
        if (!cancelled) {
          setCampaign(null)
          setCampaignLoadError('Unable to load campaign')
          setCampaignLoadState('error')
        }
      }
    }

    fetchCampaign()
    return () => {
      cancelled = true
    }
  }, [params.id])

  const campaignLeads = useMemo(() => (Array.isArray(leads) ? leads : []), [leads])

  function flattenLead(lead: Record<string, any>, prefix = ''): Record<string, any> {
    return Object.entries(lead || {}).reduce<Record<string, any>>((acc, [key, value]) => {
      const nextKey = prefix ? `${prefix}_${key}` : key

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        return { ...acc, ...flattenLead(value, nextKey) }
      }

      acc[nextKey] = value ?? ''
      return acc
    }, {})
  }

  function handleExport() {
    if (!campaignLeads.length) {
      toast.error('No leads to export yet')
      return
    }

    const rows = campaignLeads.map((lead) => flattenLead(lead))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    const sanitizedName = campaign?.name
      ? campaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      : 'campaign'

    link.download = `${sanitizedName}_${params.id}-leads.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Export started')
  }

  function getLeadLabel(lead: Record<string, any>, index: number) {
    return lead.email || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || `Lead ${index + 1}`
  }

  function renderValue(value: any) {
    if (value == null || value === '') return '—'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  function renderLeadDetails(lead: Record<string, any>) {
    const entries = Object.entries(lead || {}).filter(([, value]) => value != null && value !== '')

    return entries.length ? (
      entries.map(([key, value]) => (
        <div
          key={key}
          className="grid gap-1 border-b border-white/[0.06] py-2.5 last:border-b-0 md:grid-cols-[minmax(0,160px)_1fr]"
        >
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{key.replace(/_/g, ' ')}</span>
          <div className="whitespace-pre-wrap break-words text-sm text-zinc-300">{renderValue(value)}</div>
        </div>
      ))
    ) : (
      <p className="text-sm text-zinc-500">No additional lead details available.</p>
    )
  }

  const displayName =
    campaignLoadState === 'loading'
      ? null
      : campaignLoadState === 'error'
        ? null
        : campaign?.name || 'Untitled campaign'

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Action Bar */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4">
          <Link
            href="/dashboard/campaigns"
            className="group inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to campaigns
          </Link>
          
          {campaignLoadState === 'loading' ? (
            <div className="h-10 w-64 animate-pulse rounded-lg bg-zinc-800/80" />
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                {displayName}
              </h1>
              <span className="mt-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 font-mono text-[10px] text-zinc-500">
                ID: {params.id.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
          disabled={!campaignLeads.length}
        >
          <Download className="h-4 w-4" />
          Export leads
        </button>
      </div>

      {/* Main Content Area */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              Campaign leads
            </h2>
            <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 ring-1 ring-blue-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-bold text-blue-400">
                {campaignLeads.length} Total
              </span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <TableRowSkeleton rows={5} />
          </div>
        ) : leadsQueryError ? (
          <div className="p-12 text-center">
            <p className="text-sm text-red-400">Unable to load campaign leads.</p>
          </div>
        ) : campaignLeads.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/[0.06] bg-white/[0.01]">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Contact</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Professional</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {campaignLeads.map((lead, index) => {
                  const leadId = String(lead.id || lead.email || index)
                  const isExpanded = expandedLeadId === leadId

                  return (
                    <React.Fragment key={leadId}>
                      <tr className={`group transition-colors ${isExpanded ? 'bg-blue-500/[0.03]' : 'hover:bg-white/[0.02]'}`}>
                        <td className="px-6 py-5">
                          <div className="font-semibold text-zinc-100">{getLeadLabel(lead, index)}</div>
                          <div className="mt-1 text-xs text-zinc-500 truncate max-w-[200px]">
                            {lead.email || 'No email provided'}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-medium text-zinc-300">{lead.company_name || '—'}</div>
                          <div className="mt-1 text-xs text-zinc-500 italic">{lead.title || '—'}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex rounded-md border border-white/10 bg-zinc-900/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            {lead.status || lead.source || 'new'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLeadId((current) => (current === leadId ? null : leadId))}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                              isExpanded 
                                ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40' 
                                : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100 border border-white/10'
                            }`}
                          >
                            {isExpanded ? 'Hide info' : 'View info'}
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-0">
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="overflow-hidden"
                            >
                              <div className="my-4 rounded-xl border border-white/[0.08] bg-black/40 p-6 shadow-inner">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                  <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Lead Metadata</h4>
                                    <div className="space-y-1">{renderLeadDetails(lead)}</div>
                                  </div>
                                  <div className="rounded-lg bg-white/[0.02] p-4 border border-white/[0.04]">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Quick Context</h4>
                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-[10px] text-zinc-600 block uppercase font-bold">Campaign ID</label>
                                        <code className="text-xs text-zinc-400 break-all">{lead.campaign_id || params.id}</code>
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-zinc-600 block uppercase font-bold">Lead Ref</label>
                                        <code className="text-xs text-zinc-400">{lead.id || 'N/A'}</code>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.03] border border-white/10">
              <Download className="h-6 w-6 text-zinc-600" />
            </div>
            <h3 className="text-base font-semibold text-zinc-200">No leads found</h3>
            <p className="mt-1 text-sm text-zinc-500">Try importing some leads to this campaign.</p>
          </div>
        )}
      </div>
    </div>
  )
}
