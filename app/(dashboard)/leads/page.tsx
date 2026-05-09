"use client"

import React, { useMemo, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import useCampaigns from '../../../hooks/useCampaigns'

type LeadRow = {
  email?: string
  first_name?: string
  last_name?: string
  company_name?: string
  company_domain?: string
  website?: string
  linkedin_url?: string
  city?: string
  state?: string
  country?: string
  industry?: string
  employees?: string | number
  annual_revenue?: string
  phone?: string
  title?: string
}

function normalizeRows(rows: any[]): LeadRow[] {
  return rows
    .map((row) => ({
      email: row.email || row.Email || row.E-mail,
      first_name: row.first_name || row.firstName || row.first,
      last_name: row.last_name || row.lastName || row.last,
      company_name: row.company_name || row.company || row.Company,
      company_domain: row.company_domain || row.domain,
      website: row.website,
      linkedin_url: row.linkedin_url || row.linkedin,
      city: row.city,
      state: row.state,
      country: row.country,
      industry: row.industry,
      employees: row.employees || row.employee_count,
      annual_revenue: row.annual_revenue || row.revenue,
      phone: row.phone,
      title: row.title
    }))
    .filter((row) => Boolean(row.email))
}

export default function LeadsPage() {
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [rows, setRows] = useState<LeadRow[]>([])
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)

  const selectedCampaign = useMemo(
    () => campaigns?.find((campaign: any) => campaign.id === selectedCampaignId),
    [campaigns, selectedCampaignId]
  )

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    const extension = file.name.split('.').pop()?.toLowerCase()

    try {
      if (extension === 'csv' || extension === 'txt') {
        const text = await file.text()
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        setRows(normalizeRows((parsed.data as any[]) || []))
        toast.success(`Loaded ${((parsed.data as any[]) || []).length} rows from CSV`)
        return
      }

      if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.SheetNames[0]
        const sheet = workbook.Sheets[firstSheet]
        const json = XLSX.utils.sheet_to_json(sheet)
        setRows(normalizeRows(json))
        toast.success(`Loaded ${json.length} rows from spreadsheet`)
        return
      }

      toast.error('Please upload a CSV or Excel file')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to parse file')
    }
  }

  async function handleImport() {
    if (!selectedCampaignId) {
      toast.error('Select a campaign first')
      return
    }

    if (!rows.length) {
      toast.error('Upload a CSV or spreadsheet with leads first')
      return
    }

    setUploading(true)
    try {
      const response = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          organization_id: selectedCampaign?.organization_id || null,
          leads: rows
        })
      })

      const json = await response.json()
      if (!response.ok || json.error) {
        throw new Error(json.error?.message || json.error || 'Import failed')
      }

      toast.success(`Imported ${json.data?.length || rows.length} leads into campaign`)
      setRows([])
      setFileName('')
    } catch (error: any) {
      toast.error(error?.message || 'Unable to import leads')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-slate-600">Upload CSV or spreadsheet leads, select a campaign, and import them into that campaign.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-xl bg-white p-6 shadow">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Select Campaign</span>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
                disabled={campaignsLoading}
              >
                <option value="">Choose a campaign</option>
                {(campaigns || []).map((campaign: any) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Upload CSV or Spreadsheet</span>
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleFileChange}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span>{fileName ? `Loaded file: ${fileName}` : 'No file loaded yet'}</span>
            <span>{rows.length} leads ready</span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={uploading || !rows.length || !selectedCampaignId}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {uploading ? 'Importing...' : 'Import Leads to Campaign'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRows([])
                setFileName('')
              }}
              className="rounded-lg border px-4 py-2 font-medium text-slate-700"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">Import Preview</h2>
          <p className="mb-4 text-sm text-slate-500">First few rows from your upload.</p>

          {rows.length ? (
            <div className="max-h-[420px] overflow-auto rounded-lg border">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Company</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row, index) => (
                    <tr key={`${row.email}-${index}`} className="border-t">
                      <td className="px-3 py-2">{row.email}</td>
                      <td className="px-3 py-2">{[row.first_name, row.last_name].filter(Boolean).join(' ') || '-'}</td>
                      <td className="px-3 py-2">{row.company_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-slate-500">
              Upload a CSV or spreadsheet to preview leads before importing.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Imported Leads</h2>
        <p className="text-sm text-slate-500">This table will show leads after they are imported to Supabase.</p>
      </div>
    </div>
  )
}
