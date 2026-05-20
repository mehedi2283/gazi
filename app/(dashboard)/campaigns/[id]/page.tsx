"use client"

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, ChevronUp, Download, Trash2 } from 'lucide-react'
import useLeads from '../../../../hooks/useLeads'
import useCurrentUser from '../../../../hooks/useCurrentUser'
import { TableRowSkeleton } from '../../../../components/ui/Skeleton'
import Modal from '../../../../components/ui/Modal'

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [page, setPage] = useState(1)
  const perPage = 10
  const { data: leads, meta, isLoading, error: leadsQueryError, refetch } = useLeads(params.id, page, perPage)
  const { user, isAdmin } = useCurrentUser()
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [threads, setThreads] = useState<Record<string, any>>({})
  const [campaign, setCampaign] = useState<any | null>(null)
  const [campaignLoadState, setCampaignLoadState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [campaignLoadError, setCampaignLoadError] = useState<string | null>(null)
  const [deletingLeadId, setDeletingLeadId] = useState('')
  const [leadDeleteModalFor, setLeadDeleteModalFor] = useState<Record<string, any> | null>(null)

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

        setCampaign(row)
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

  const searchParams = useSearchParams()

  useEffect(() => {
    const leadParam = searchParams?.get('lead')
    if (leadParam && campaignLeads.length) {
      const found = campaignLeads.find((l) => String(l.id) === String(leadParam) || String(l.email) === String(leadParam))
      if (found) {
        const leadIdKey = String(found.id || found.email || '')
        setExpandedLeadId(leadIdKey)
        loadThreadForLead(found)
        setTimeout(() => {
          try {
            const el = document.getElementById(`lead-row-${leadIdKey}`)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          } catch {}
        }, 200)
      }
    }
  }, [searchParams, campaignLeads])

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

  async function handleExport() {
    if (!campaignLeads.length) {
      toast.error('No leads to export yet')
      return
    }

    let rows = campaignLeads.map((lead) => flattenLead(lead))

    try {
      const response = await fetch(`/api/leads?campaign_id=${params.id}&export=1`)
      const result = await response.json()
      if (response.ok && Array.isArray(result?.data)) {
        rows = result.data.map((lead: Record<string, any>) => flattenLead(lead))
      }
    } catch {
      rows = campaignLeads.map((lead) => flattenLead(lead))
    }

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

  async function handleDeleteLead(lead: Record<string, any>) {
    if (!isAdmin) return

    const leadId = String(lead.id || '')
    if (!leadId) return

    setDeletingLeadId(leadId)
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, { method: 'DELETE' })
      const json = await response.json()

      if (!response.ok || json.error) {
        throw new Error(json.error?.message || json.error || 'Failed to delete lead')
      }

      toast.success('Lead deleted')
      setExpandedLeadId((current) => (current === leadId ? null : current))
      setThreads((current) => {
        const next = { ...current }
        delete next[leadId]
        return next
      })
      await refetch()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete lead')
    } finally {
      setDeletingLeadId('')
    }
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

  function renderConversation(lead: Record<string, any>) {
    const leadIdKey = String(lead.id || lead.email || '')
    const thread = threads[leadIdKey]

    if (!thread) {
      return <p className="text-sm text-slate-400">Loading messages or no messages yet.</p>
    }

    const safeParseMessages = (rawMessages: any) => {
      if (Array.isArray(rawMessages)) return rawMessages
      if (typeof rawMessages !== 'string') return []

      const tryParse = (s: string) => {
        try { return JSON.parse(s) } catch { return null }
      }

      // 1) direct parse
      let parsed = tryParse(rawMessages)
      if (Array.isArray(parsed)) return parsed

      // 2) strip surrounding quotes
      if (parsed == null && rawMessages.startsWith('"') && rawMessages.endsWith('"')) {
        parsed = tryParse(rawMessages.slice(1, -1))
        if (Array.isArray(parsed)) return parsed
      }

      // 3) escape newlines/tabs
      const escapeControls = (s: string) => s.replace(/\r\n|\r|\n/g, '\\n').replace(/\t/g, '\\t')
      parsed = tryParse(escapeControls(rawMessages))
      if (Array.isArray(parsed)) return parsed

      // 4) escape all C0 control chars
      const escapeAll = (s: string) => s.replace(/[\u0000-\u001F]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`)
      parsed = tryParse(escapeAll(rawMessages))
      if (Array.isArray(parsed)) return parsed

      // 5) extract first array substring
      const first = rawMessages.indexOf('[')
      const last = rawMessages.lastIndexOf(']')
      if (first !== -1 && last !== -1 && last > first) {
        const sub = rawMessages.slice(first, last + 1)
        parsed = tryParse(sub) || tryParse(escapeControls(sub)) || tryParse(escapeAll(sub))
        if (Array.isArray(parsed)) return parsed
      }

      return []
    }

    const messages = safeParseMessages(thread.messages).slice().sort((a: any, b: any) => new Date(a.timestamp || a.created_at || 0).getTime() - new Date(b.timestamp || b.created_at || 0).getTime())

    const sanitizeBody = (text: string | undefined) => {
      if (!text || typeof text !== 'string') return '—'

      // Preserve angle-bracketed segments (e.g., <https://...>) so URLs are not broken
      const placeholders: string[] = []
      const protectedText = text.replace(/<[^>]*>/g, (m) => {
        const idx = placeholders.length
        placeholders.push(m)
        return `__ANG${idx}__`
      })

      // Replace sequences of > (common mail-quote markers) with newlines
      let cleaned = protectedText.replace(/>+\s*/g, '\n')

      // Collapse multiple blank lines and trim
      cleaned = cleaned.replace(/\n{2,}/g, '\n\n').trim()

      // Restore protected placeholders
      cleaned = cleaned.replace(/__ANG(\d+)__/g, (_, n) => placeholders[Number(n)] || '')

      return cleaned
    }

    return (
      <div className="flex flex-col gap-3">
        {messages.map((msg: any) => {
          const isSent = (msg.type || msg.side) === 'sent' || msg.side === 'right'
          const label = msg.type === 'reply' || msg.side === 'left' ? 'Reply' : 'Sent'
          const body = sanitizeBody(msg.body || msg.reply_text || msg.lead_reply || '')

          return (
            <div key={msg.id || msg.reply_event_id || Math.random()} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
              <div className={`${isSent ? 'bg-indigo-50 text-indigo-900' : 'bg-white border border-slate-200 text-slate-700'} max-w-[70%] rounded-lg p-3 text-sm`}> 
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold text-slate-500">{msg.subject || ''}</div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSent ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{label}</div>
                </div>
                <div className="whitespace-pre-wrap break-words text-sm leading-snug">{body}</div>
                <div className="text-[11px] text-slate-400 mt-2">{msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  async function loadThreadForLead(lead: Record<string, any>) {
    const leadIdKey = String(lead.id || lead.email || '')
    if (threads[leadIdKey]) return
    try {
      const url = `/api/threads?lead_id=${encodeURIComponent(lead.id || '')}&campaign_id=${encodeURIComponent(params.id)}`
      const res = await fetch(url)
      const json = await res.json()
      if (res.ok && json?.data) {
        const row = json.data
        const normalizedMessages = (() => {
          const rawMessages = row.messages
          if (Array.isArray(rawMessages)) return rawMessages
          if (typeof rawMessages !== 'string') return []

          const tryParse = (s: string) => {
            try { return JSON.parse(s) } catch { return null }
          }

          let parsed = tryParse(rawMessages)
          if (Array.isArray(parsed)) return parsed

          if (parsed == null && rawMessages.startsWith('"') && rawMessages.endsWith('"')) {
            parsed = tryParse(rawMessages.slice(1, -1))
            if (Array.isArray(parsed)) return parsed
          }

          const escapeControls = (s: string) => s.replace(/\r\n|\r|\n/g, '\\n').replace(/\t/g, '\\t')
          parsed = tryParse(escapeControls(rawMessages))
          if (Array.isArray(parsed)) return parsed

          const escapeAll = (s: string) => s.replace(/[\u0000-\u001F]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`)
          parsed = tryParse(escapeAll(rawMessages))
          if (Array.isArray(parsed)) return parsed

          const first = rawMessages.indexOf('[')
          const last = rawMessages.lastIndexOf(']')
          if (first !== -1 && last !== -1 && last > first) {
            const sub = rawMessages.slice(first, last + 1)
            parsed = tryParse(sub) || tryParse(escapeControls(sub)) || tryParse(escapeAll(sub))
            if (Array.isArray(parsed)) return parsed
          }

          return []
        })()
        setThreads((prev) => ({ ...prev, [leadIdKey]: { ...row, messages: normalizedMessages } }))
      } else {
        setThreads((prev) => ({ ...prev, [leadIdKey]: null }))
      }
    } catch (err) {
      setThreads((prev) => ({ ...prev, [leadIdKey]: null }))
    }
  }

  function handleToggleLead(lead: Record<string, any>, leadId: string) {
    setExpandedLeadId((current) => {
      const next = current === leadId ? null : leadId
      if (next) loadThreadForLead(lead)
      return next
    })
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
              <div className="mt-1 text-sm text-slate-500">
                {campaign?.company_name ? <span className="mr-3">Company: <strong className="text-slate-700">{campaign.company_name}</strong></span> : null}
                {campaign?.created_from_company ? <span>Creator: <strong className="text-slate-700">{campaign.created_from_company}</strong></span> : null}
              </div>
              <span className="mt-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] text-slate-500">
                ID: {params.id.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-250 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-sm disabled:opacity-45"
            disabled={!campaignLeads.length}
          >
            <Download className="h-4 w-4" />
            Export leads
          </button>
        )}
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
                {meta?.total ?? campaignLeads.length} Total
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
          <>
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

                  const temp = String(lead.lead_score || 'cold').toLowerCase()
                  let rowBg = isExpanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50/40'
                  let expandedBg = 'bg-slate-50/50'

                  if (temp === 'hot') {
                    rowBg = isExpanded ? 'bg-rose-50/70' : 'bg-rose-50/50 hover:bg-rose-100/50'
                    expandedBg = 'bg-rose-50/30'
                  } else if (temp === 'warm') {
                    rowBg = isExpanded ? 'bg-amber-50/80' : 'bg-amber-50/60 hover:bg-amber-100/60'
                    expandedBg = 'bg-amber-50/40'
                  } else if (temp === 'cold') {
                    rowBg = isExpanded ? 'bg-blue-50/70' : 'bg-blue-50/50 hover:bg-blue-100/50'
                    expandedBg = 'bg-blue-50/30'
                  } else if (temp === 'neutral') {
                    rowBg = isExpanded ? 'bg-slate-50/85' : 'bg-slate-50/70 hover:bg-slate-100/70'
                    expandedBg = 'bg-slate-50/40'
                  }

                  return (
                    <React.Fragment key={leadId}>
                      <tr id={`lead-row-${leadId}`} className={`group transition-colors ${rowBg}`}>
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
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleLead(lead, leadId)}
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

                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={() => setLeadDeleteModalFor(lead)}
                                disabled={deletingLeadId === leadId}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingLeadId === leadId ? 'Deleting...' : 'Delete'}
                              </button>
                            ) : null}
                          </div>
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
                              <div className={`my-4 rounded-xl border border-slate-200 p-6 shadow-sm ${expandedBg}`}>
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

                                  <Modal
                                    open={Boolean(leadDeleteModalFor)}
                                    title="Delete lead"
                                    onClose={() => setLeadDeleteModalFor(null)}
                                  >
                                    <div className="space-y-4">
                                      <p className="text-sm leading-relaxed text-slate-600">
                                        Delete <strong className="text-slate-800">{leadDeleteModalFor ? getLeadLabel(leadDeleteModalFor, 0) : ''}</strong>? This cannot be undone.
                                      </p>
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                          onClick={() => setLeadDeleteModalFor(null)}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                                          onClick={async () => {
                                            if (!leadDeleteModalFor) return
                                            const target = leadDeleteModalFor
                                            setLeadDeleteModalFor(null)
                                            await handleDeleteLead(target)
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </Modal>
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-slate-400 block uppercase font-bold">Lead Ref</label>
                                        <code className="text-xs text-slate-600 font-medium">{lead.id || 'N/A'}</code>
                                      </div>
                                    </div>
                                    <div className="mt-4">
                                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-2">Conversation</h4>
                                      {renderConversation(lead)}
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
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
            <span className="text-xs text-slate-400">
              Showing {Math.min((page - 1) * perPage + 1, meta?.total ?? campaignLeads.length)}-{Math.min(page * perPage, meta?.total ?? campaignLeads.length)} of {meta?.total ?? campaignLeads.length}
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
              <span className="min-w-[60px] text-center text-xs font-medium text-slate-500">
                Page {page} of {Math.max(1, Math.ceil((meta?.total ?? campaignLeads.length) / perPage))}
              </span>
              <button
                type="button"
                disabled={page >= Math.max(1, Math.ceil((meta?.total ?? campaignLeads.length) / perPage))}
                onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil((meta?.total ?? campaignLeads.length) / perPage)), p + 1))}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
          </>
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
