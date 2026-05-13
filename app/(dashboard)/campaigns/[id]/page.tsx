"use client"

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import useLeads from '../../../../hooks/useLeads'

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const { data: leads, isLoading, error } = useLeads(params.id)
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)

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
    link.download = `campaign-${params.id}-leads.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function getLeadLabel(lead: Record<string, any>, index: number) {
    return lead.email || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || `Lead ${index + 1}`
  }

  function getLeadSubtitle(lead: Record<string, any>) {
    return lead.company_name || lead.title || lead.company_domain || 'Lead record'
  }

  function renderValue(value: any) {
    if (value == null || value === '') return '-'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  function renderLeadDetails(lead: Record<string, any>) {
    const entries = Object.entries(lead || {}).filter(([, value]) => value != null && value !== '')

    return entries.length ? entries.map(([key, value]) => (
      <div key={key} className="grid gap-1 border-b border-slate-100 py-2 last:border-b-0 md:grid-cols-[160px_1fr]">
        <span className="text-sm font-medium text-slate-500">{key.replace(/_/g, ' ')}</span>
        <div className="whitespace-pre-wrap text-sm text-slate-800">{renderValue(value)}</div>
      </div>
    )) : <p className="text-sm text-slate-500">No additional lead details available.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to campaigns
          </Link>
          <h1 className="text-2xl font-bold">Campaign Details</h1>
          <p className="text-slate-600">Campaign ID: {params.id}</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
          disabled={!campaignLeads.length}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export leads
        </button>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Campaign Leads</h2>
            <p className="text-sm text-slate-600">{campaignLeads.length} lead{campaignLeads.length === 1 ? '' : 's'} found for this campaign.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-600">Loading campaign leads...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Unable to load campaign leads.</p>
        ) : campaignLeads.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {campaignLeads.map((lead, index) => {
                  const leadId = String(lead.id || lead.email || index)
                  const isExpanded = expandedLeadId === leadId

                  return (
                    <React.Fragment key={lead.id || `${lead.email || 'lead'}-${index}`}>
                      <tr className="align-top hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">{getLeadLabel(lead, index)}</div>
                          <div className="text-sm text-slate-500">ID: {lead.id || '-'}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">{lead.company_name || '-'}</td>
                        <td className="px-4 py-4 text-sm text-slate-700">{lead.title || '-'}</td>
                        <td className="px-4 py-4 text-sm text-slate-700">{lead.status || lead.source || '-'}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLeadId((current) => (current === leadId ? null : leadId))}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                            {isExpanded ? 'Hide' : 'Show'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-slate-50">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <h3 className="text-base font-semibold text-slate-900">{getLeadLabel(lead, index)}</h3>
                                  <p className="text-sm text-slate-500">{getLeadSubtitle(lead)}</p>
                                </div>
                                <div className="text-sm text-slate-500">Campaign ID: {lead.campaign_id || params.id}</div>
                              </div>
                              <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">{renderLeadDetails(lead)}</div>
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
        ) : (
          <p className="text-slate-600">No leads yet or leads are generating, please wait.</p>
        )}
      </div>
    </div>
  )
}
