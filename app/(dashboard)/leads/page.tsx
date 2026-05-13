"use client"

import React, { useMemo } from 'react'
import useCampaigns from '../../../hooks/useCampaigns'
import useLeads from '../../../hooks/useLeads'

function formatName(lead: any) {
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '-'
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

export default function LeadsPage() {
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
  const { data: leads, isLoading: leadsLoading, error: leadsError, refetch } = useLeads()

  const campaignNameById = useMemo(() => {
    return new Map<string, string>((campaigns || []).map((campaign: any) => [String(campaign.id), String(campaign.name)]))
  }, [campaigns])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-slate-600">View imported leads and manage campaign lead imports from spreadsheets.</p>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold">Leads</h2>
            <p className="text-sm text-slate-500">{leads?.length || 0} leads in Supabase</p>
          </div>
        </div>

        {leadsLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : leadsError ? (
          <div className="p-6 text-sm text-red-600">Failed to load leads.</div>
        ) : leads?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {leads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{lead.email}</td>
                    <td className="px-4 py-3 text-slate-700">{formatName(lead)}</td>
                    <td className="px-4 py-3 text-slate-700">{lead.company_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{lead.title || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{campaignNameById.get(lead.campaign_id) || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {lead.status || 'new'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{lead.source || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="text-lg font-semibold text-slate-900">No leads yet</div>
            <p className="max-w-md text-sm text-slate-500">Import a CSV or spreadsheet to populate this table.</p>
          </div>
        )}
      </div>
    </div>
  )
}
