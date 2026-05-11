"use client"

import React, { useMemo, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { Plus, Upload, UserPlus, X } from 'lucide-react'
import useCampaigns from '../../../hooks/useCampaigns'
import useLeads from '../../../hooks/useLeads'
import Modal from '../../../components/ui/Modal'

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

type AddMode = 'import' | 'manual' | 'apollo'

const REQUIRED_IMPORT_COLUMNS = [
  { key: 'email', label: 'email', aliases: ['email', 'e_mail', 'e-mail'] },
  { key: 'first_name', label: 'first_name', aliases: ['first_name', 'firstname', 'first'] },
  { key: 'last_name', label: 'last_name', aliases: ['last_name', 'lastname', 'last'] },
  { key: 'company_name', label: 'company_name', aliases: ['company_name', 'company', 'companyname'] },
  { key: 'company_domain', label: 'company_domain', aliases: ['company_domain', 'domain', 'companydomain'] },
  { key: 'website', label: 'website', aliases: ['website', 'url', 'site'] },
  { key: 'linkedin_url', label: 'linkedin_url', aliases: ['linkedin_url', 'linkedin', 'person_linkedin_url', 'company_linkedin_url'] },
  { key: 'city', label: 'city', aliases: ['city'] },
  { key: 'state', label: 'state', aliases: ['state'] },
  { key: 'country', label: 'country', aliases: ['country'] },
  { key: 'industry', label: 'industry', aliases: ['industry'] },
  { key: 'employees', label: 'employees', aliases: ['employees', 'employee_count', 'number_of_employees'] },
  { key: 'annual_revenue', label: 'annual_revenue', aliases: ['annual_revenue', 'revenue'] },
  { key: 'phone', label: 'phone', aliases: ['phone', 'phone_number', 'telephone'] },
  { key: 'title', label: 'title', aliases: ['title', 'role', 'position'] }
]

function normalizeRows(rows: any[]): LeadRow[] {
  function normalizeKeys(obj: any) {
    const out: Record<string, any> = {}
    Object.keys(obj || {}).forEach((k) => {
      const nk = String(k || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w_]/g, '')
      out[nk] = obj[k]
    })
    return out
  }

  function findByKeys(obj: any, keys: string[], substrFallback?: string) {
    for (const k of keys) {
      if (obj[k] != null && obj[k] !== '') return obj[k]
    }
    if (substrFallback) {
      const found = Object.keys(obj).find((kk) => kk.includes(substrFallback))
      if (found) return obj[found]
    }
    return undefined
  }

  return rows
    .map((row) => {
      const nr = normalizeKeys(row)
      return {
        email: findByKeys(nr, ['email', 'e_mail', 'e-mail'], 'email'),
        first_name: findByKeys(nr, ['first_name', 'firstname', 'first'], 'first'),
        last_name: findByKeys(nr, ['last_name', 'lastname', 'last'], 'last'),
        company_name: findByKeys(nr, ['company_name', 'company', 'companyname'], 'company'),
        company_domain: findByKeys(nr, ['company_domain', 'domain', 'companydomain'], 'domain'),
        website: findByKeys(nr, ['website', 'url', 'site'], 'web'),
        linkedin_url: findByKeys(nr, ['linkedin_url', 'linkedin', 'person_linkedin_url', 'company_linkedin_url'], 'linkedin'),
        city: findByKeys(nr, ['city'], 'city'),
        state: findByKeys(nr, ['state'], 'state'),
        country: findByKeys(nr, ['country'], 'country'),
        industry: findByKeys(nr, ['industry'], 'industry'),
        employees: findByKeys(nr, ['employees', 'employee_count', 'number_of_employees'], 'employee'),
        annual_revenue: findByKeys(nr, ['annual_revenue', 'revenue'], 'revenue'),
        phone: findByKeys(nr, ['phone', 'phone_number', 'telephone'], 'phone'),
        title: findByKeys(nr, ['title', 'role', 'position'], 'title')
      }
    })
    .filter((row) => Boolean(row.email))
}

function normalizeHeaderName(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '')
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value)
  }

  const temp = document.createElement('textarea')
  temp.value = value
  temp.style.position = 'fixed'
  temp.style.opacity = '0'
  document.body.appendChild(temp)
  temp.select()
  document.execCommand('copy')
  document.body.removeChild(temp)
}

function isMatchingHeader(header: string) {
  const normalized = normalizeHeaderName(header)
  return REQUIRED_IMPORT_COLUMNS.some((column) => column.aliases.some((alias) => normalizeHeaderName(alias) === normalized))
}

function getCopyAllHeadersValue() {
  return REQUIRED_IMPORT_COLUMNS.map((column) => column.label).join('\t')
}

function getCopyAllHeadersValue() {
  return REQUIRED_IMPORT_COLUMNS.map((column) => column.label).join('\t')
}

function formatName(lead: any) {
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '-'
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

export default function LeadsPage() {
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
  const { data: leads, isLoading: leadsLoading, error: leadsError, refetch, add } = useLeads()
  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('import')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [apolloMarketName, setApolloMarketName] = useState('')
  const [apolloProductName, setApolloProductName] = useState('')
  const [apolloContactsWanted, setApolloContactsWanted] = useState('')
  const [rows, setRows] = useState<LeadRow[]>([])
  const [fileName, setFileName] = useState('')
  const [fileHeaders, setFileHeaders] = useState<string[]>([])
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [apolloSubmitting, setApolloSubmitting] = useState(false)

  const selectedCampaign = useMemo(
    () => campaigns?.find((campaign: any) => campaign.id === selectedCampaignId),
    [campaigns, selectedCampaignId]
  )

  const campaignNameById = useMemo(() => {
    return new Map<string, string>((campaigns || []).map((campaign: any) => [String(campaign.id), String(campaign.name)]))
  }, [campaigns])

  const headerStatuses = useMemo(() => {
    return fileHeaders.map((header) => {
      const normalized = normalizeHeaderName(header)
      const matchedColumn = REQUIRED_IMPORT_COLUMNS.find((column) =>
        column.aliases.some((alias) => normalizeHeaderName(alias) === normalized)
      )

      return {
        header,
        matched: Boolean(matchedColumn),
        recommended: matchedColumn?.label || REQUIRED_IMPORT_COLUMNS.find((column) =>
          column.key === 'email'
        )?.label || 'email'
      }
    })
  }, [fileHeaders])

  const unmatchedHeaders = headerStatuses.filter((item) => !item.matched)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    const extension = file.name.split('.').pop()?.toLowerCase()

    try {
      if (extension === 'csv' || extension === 'txt') {
        const text = await file.text()
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        const normalized = normalizeRows((parsed.data as any[]) || [])
        setRows(normalized)
        setFileHeaders(((parsed.meta?.fields || []) as string[]).filter(Boolean))
        setImportModalOpen(true)
        toast.success(`Loaded ${normalized.length} leads from CSV`)
        return
      }

      if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.SheetNames[0]
        const sheet = workbook.Sheets[firstSheet]
        const json = XLSX.utils.sheet_to_json(sheet)
        const normalized = normalizeRows(json)
        setRows(normalized)
        setFileHeaders(json.length ? Object.keys(json[0] || {}) : [])
        setImportModalOpen(true)
        toast.success(`Loaded ${normalized.length} leads from spreadsheet`)
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
      setFileHeaders([])
      setImportModalOpen(false)
      await refetch()
    } catch (error: any) {
      toast.error(error?.message || 'Unable to import leads')
    } finally {
      setUploading(false)
    }
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget

    if (!selectedCampaignId) {
      toast.error('Select a campaign first')
      return
    }

    const formData = new FormData(form)
    const email = String(formData.get('email') || '').trim()

    if (!email) {
      toast.error('Email is required')
      return
    }

    setManualSubmitting(true)
    try {
      const response = await add.mutateAsync({
        organization_id: selectedCampaign?.organization_id || null,
        campaign_id: selectedCampaignId,
        email,
        first_name: String(formData.get('first_name') || '').trim() || null,
        last_name: String(formData.get('last_name') || '').trim() || null,
        title: String(formData.get('title') || '').trim() || null,
        company_name: String(formData.get('company_name') || '').trim() || null,
        company_domain: String(formData.get('company_domain') || '').trim() || null,
        phone: String(formData.get('phone') || '').trim() || null,
        linkedin_url: String(formData.get('linkedin_url') || '').trim() || null,
        source: 'manual'
      })
      toast.success('Lead added')
      if (response?.data?.webhookError) {
        toast.error(`Webhook failed: ${response.data.webhookError}`)
      }
      form.reset()
      setAddOpen(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.response?.data?.error || error?.message || 'Unable to add lead')
    } finally {
      setManualSubmitting(false)
    }
  }

  async function handleApolloSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget

    if (!selectedCampaignId) {
      toast.error('Select a campaign first')
      return
    }

    if (!apolloMarketName.trim()) {
      toast.error('Market name is required')
      return
    }

    if (!apolloProductName.trim()) {
      toast.error('Product name is required')
      return
    }

    if (!apolloContactsWanted.trim()) {
      toast.error('How many contacts they want is required')
      return
    }

    setApolloSubmitting(true)
    try {
      const response = await fetch('/api/leads/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_name: apolloMarketName.trim(),
          product_name: apolloProductName.trim(),
          contacts_wanted: Number(apolloContactsWanted),
          campaign_id: selectedCampaignId,
          campaign_name: selectedCampaign?.name || null,
          organization_id: selectedCampaign?.organization_id || null,
          source: 'apollo'
        })
      })

      const json = await response.json()
      if (!response.ok || json.error) {
        throw new Error(json.error?.message || json.error || 'Apollo webhook failed')
      }

      toast.success('Apollo request sent to webhook')
      setApolloMarketName('')
      setApolloProductName('')
      setApolloContactsWanted('')
      form.reset()
      setAddOpen(false)
    } catch (error: any) {
      toast.error(error?.message || 'Unable to send Apollo request')
    } finally {
      setApolloSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-slate-600">View imported leads and add new leads manually or from a spreadsheet.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          {addOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          {addOpen ? 'Close' : 'Add Lead'}
        </button>
      </div>

      {addOpen ? (
        <div className="space-y-5 rounded-lg bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Add Lead</h2>
            <div className="inline-flex rounded-lg border bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setAddMode('import')}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${addMode === 'import' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Import
              </button>
              <button
                type="button"
                onClick={() => setAddMode('manual')}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${addMode === 'manual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Manual
              </button>
              <button
                type="button"
                onClick={() => setAddMode('apollo')}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${addMode === 'apollo' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Apollo
              </button>
            </div>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium">Campaign</span>
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

          {addMode === 'import' ? (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <label className="space-y-2 block">
                  <span className="text-sm font-medium">Upload CSV or Spreadsheet</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </label>

                <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span>{fileName ? `Loaded file: ${fileName}` : 'No file loaded yet'}</span>
                  <span>{rows.length} leads ready</span>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <div className="font-semibold">Before uploading</div>
                  <p className="mt-1">
                    Copy all column names, click the first cell in your sheet, and paste once to populate the header row.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await copyToClipboard(getCopyAllHeadersValue())
                        toast.success('Copied all column names')
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
                    >
                      Copy all column names
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(true)}
                    disabled={uploading || !rows.length || !selectedCampaignId}
                    className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
                  >
                    Review & Import
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRows([])
                      setFileName('')
                      setFileHeaders([])
                      setImportModalOpen(false)
                    }}
                    className="rounded-lg border px-4 py-2 font-medium text-slate-700"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold">Import Preview</h3>
                <p className="mb-3 text-sm text-slate-500">Open the review modal to see all rows and confirm the import.</p>

                {fileHeaders.length ? (
                  <div className="space-y-3 rounded-lg border p-4 text-sm">
                    <div>
                      <div className="font-semibold text-slate-900">Detected columns</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {headerStatuses.map((item) => (
                          <span
                            key={item.header}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${item.matched ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {item.header}
                          </span>
                        ))}
                      </div>
                    </div>

                    {unmatchedHeaders.length ? (
                      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
                        <div className="font-semibold">These columns are not matching</div>
                        <p className="mt-1 text-sm">
                          Copy the suggested column name and paste it into the sheet before uploading.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {unmatchedHeaders.map((item) => (
                            <button
                              key={item.header}
                              type="button"
                              onClick={async () => {
                                await copyToClipboard(item.recommended)
                                toast.success(`Copied ${item.recommended}`)
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-900"
                            >
                              {item.header} → copy {item.recommended}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-slate-500">
                    Upload a CSV or spreadsheet to preview leads before importing.
                  </div>
                )}
              </div>
            </div>
          ) : addMode === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Email</span>
                  <input name="email" type="email" required className="w-full rounded-lg border px-3 py-2" placeholder="lead@example.com" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">First Name</span>
                  <input name="first_name" className="w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Last Name</span>
                  <input name="last_name" className="w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Title</span>
                  <input name="title" className="w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Company</span>
                  <input name="company_name" className="w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Company Domain</span>
                  <input name="company_domain" className="w-full rounded-lg border px-3 py-2" placeholder="example.com" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Phone</span>
                  <input name="phone" className="w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium">LinkedIn URL</span>
                  <input name="linkedin_url" className="w-full rounded-lg border px-3 py-2" />
                </label>
              </div>

              <button
                type="submit"
                disabled={manualSubmitting || !selectedCampaignId}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
              >
                {manualSubmitting ? 'Adding...' : 'Add Lead'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleApolloSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Market name</span>
                  <input
                    name="market_name"
                    value={apolloMarketName}
                    onChange={(e) => setApolloMarketName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="e.g. SaaS founders"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Product name</span>
                  <input
                    name="product_name"
                    value={apolloProductName}
                    onChange={(e) => setApolloProductName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="e.g. CRM automation"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">How many contacts they want</span>
                  <input
                    name="contacts_wanted"
                    type="number"
                    min="1"
                    value={apolloContactsWanted}
                    onChange={(e) => setApolloContactsWanted(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="100"
                  />
                </label>
              </div>

              <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                This will send a webhook with the market name, product name, desired contact count, and selected campaign ID.
              </div>

              <button
                type="submit"
                disabled={apolloSubmitting || !selectedCampaignId}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
              >
                {apolloSubmitting ? 'Sending...' : 'Send to Webhook'}
              </button>
            </form>
          )}
        </div>
      ) : null}

      <Modal
        open={importModalOpen && rows.length > 0}
        title="Review import"
        onClose={() => setImportModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-semibold">Before uploading</div>
            <p className="mt-1">
              Copy all column names, click the first cell in your sheet, and paste once so the header row is filled automatically.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await copyToClipboard(getCopyAllHeadersValue())
                  toast.success('Copied all column names')
                }}
                className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
              >
                Copy all column names
              </button>
            </div>
          </div>

          {unmatchedHeaders.length ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <div className="font-semibold">Column names not matching</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {unmatchedHeaders.map((item) => (
                  <button
                    key={item.header}
                    type="button"
                    onClick={async () => {
                      await copyToClipboard(item.recommended)
                      toast.success(`Copied ${item.recommended}`)
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-900"
                  >
                    {item.header} → copy {item.recommended}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border">
            <div className="border-b bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              Full details
            </div>
            <div className="max-h-[45vh] overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2">Domain</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">LinkedIn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row, index) => (
                    <tr key={`${row.email || 'row'}-${index}`} className="align-top">
                      <td className="px-3 py-2">{row.email || '-'}</td>
                      <td className="px-3 py-2">{[row.first_name, row.last_name].filter(Boolean).join(' ') || '-'}</td>
                      <td className="px-3 py-2">{row.company_name || '-'}</td>
                      <td className="px-3 py-2">{row.company_domain || '-'}</td>
                      <td className="px-3 py-2">{row.title || '-'}</td>
                      <td className="px-3 py-2">{row.phone || '-'}</td>
                      <td className="px-3 py-2 break-all">{row.linkedin_url || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setImportModalOpen(false)}
              className="rounded-lg border px-4 py-2 font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={uploading || !rows.length || !selectedCampaignId}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {uploading ? 'Importing...' : 'Confirm Import'}
            </button>
          </div>
        </div>
      </Modal>

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
            <p className="max-w-md text-sm text-slate-500">Add leads manually or import a CSV/spreadsheet to populate this table.</p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Lead
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
