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
          className="grid gap-1 border-b border-slate-200/60 py-2.5 last:border-b-0 md:grid-cols-[minmax(0,160px)_1fr]"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{key.replace(/_/g, ' ')}</span>
          <div className="whitespace-pre-wrap break-words text-sm text-slate-700 font-medium">{renderValue(value)}</div>
        </div>
      ))
    ) : (
      <p className="text-sm text-slate-400 font-medium">No additional lead details available.</p>
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
            className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to campaigns
          </Link>
          
          {campaignLoadState === 'loading' ? (
            <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 md:text-4xl">
                {displayName}
              </h1>
              <span className="mt-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] text-slate-500">
                ID: {params.id.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-250 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-sm disabled:opacity-45"
          disabled={!campaignLeads.length}
        >
          <Download className="h-4 w-4" />
          Export leads
        </button>
      </div>

      {/* Main Content Area */}
      <div className="rounded-xl border border-slate-200 bg-white/70 shadow-glass backdrop-blur-xl overflow-hidden">
        <div className="border-b border-slate-200/65 bg-white/40 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
              Campaign leads
            </h2>
            <div className="flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 ring-1 ring-indigo-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-xs font-bold text-indigo-600">
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
            <p className="text-sm text-red-500 font-semibold">Unable to load campaign leads.</p>
          </div>
        ) : campaignLeads.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Professional</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-transparent">
                {campaignLeads.map((lead, index) => {
                  const leadId = String(lead.id || lead.email || index)
                  const isExpanded = expandedLeadId === leadId

                  return (
                    <React.Fragment key={leadId}>
                      <tr className={`group transition-colors ${isExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50/40'}`}>
                        <td className="px-6 py-5">
                          <div className="font-bold text-slate-800">{getLeadLabel(lead, index)}</div>
                          <div className="mt-1 text-xs text-slate-400 font-medium truncate max-w-[200px]">
                            {lead.email || 'No email provided'}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-semibold text-slate-700">{lead.company_name || '—'}</div>
                          <div className="mt-1 text-xs text-slate-400 font-medium italic">{lead.title || '—'}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {lead.status || lead.source || 'new'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLeadId((current) => (current === leadId ? null : leadId))}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                              isExpanded 
                                ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20' 
                                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 shadow-sm'
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
                              <div className="my-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                  <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Lead Metadata</h4>
                                    <div className="space-y-1">{renderLeadDetails(lead)}</div>
                                  </div>
                                  <div className="rounded-lg bg-white p-4 border border-slate-200 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Quick Context</h4>
                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-[10px] text-slate-400 block uppercase font-bold">Campaign ID</label>
                                        <code className="text-xs text-slate-600 font-medium break-all">{lead.campaign_id || params.id}</code>
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-slate-400 block uppercase font-bold">Lead Ref</label>
                                        <code className="text-xs text-slate-600 font-medium">{lead.id || 'N/A'}</code>
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
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
              <Download className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-700">No leads found</h3>
            <p className="mt-1 text-sm text-slate-400 font-medium">Try importing some leads to this campaign.</p>
          </div>
        )}
      </div>
    </div>
  )
}
