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
  title?: string
  company_name?: string
  company_linkedin_url?: string
  company_domain?: string
  website?: string
  linkedin_url?: string
  facebook_url?: string
  twitter_url?: string
  city?: string
  state?: string
  country?: string
  company_address?: string
  company_city?: string
  company_state?: string
  company_country?: string
  company_phone?: string
  technologies?: string
  industry?: string
  employees?: string | number
  annual_revenue?: string
  total_funding?: string
  latest_funding?: string
  latest_funding_amount?: string
  last_raised_at?: string
  sent_at?: string
  status?: string
}

type AddMode = 'import' | 'manual' | 'apollo'

const REQUIRED_IMPORT_COLUMNS = [
  { key: 'email', label: 'Email', aliases: ['Email'] },
  { key: 'first_name', label: 'First Name', aliases: ['First Name'] },
  { key: 'last_name', label: 'Last Name', aliases: ['Last Name'] },
  { key: 'title', label: 'Title', aliases: ['Title'] },
  { key: 'company_name', label: 'Company Name', aliases: ['Company Name'] },
  { key: 'employees', label: '# Employees', aliases: ['# Employees'] },
  { key: 'industry', label: 'Industry', aliases: ['Industry'] },
  { key: 'linkedin_url', label: 'Person Linkedin Url', aliases: ['Person Linkedin Url'] },
  { key: 'website', label: 'Website', aliases: ['Website'] },
  { key: 'company_linkedin_url', label: 'Company Linkedin Url', aliases: ['Company Linkedin Url'] },
  { key: 'facebook_url', label: 'Facebook Url', aliases: ['Facebook Url'] },
  { key: 'twitter_url', label: 'Twitter Url', aliases: ['Twitter Url'] },
  { key: 'city', label: 'City', aliases: ['City'] },
  { key: 'state', label: 'State', aliases: ['State'] },
  { key: 'country', label: 'Country', aliases: ['Country'] },
  { key: 'company_address', label: 'Company Address', aliases: ['Company Address'] },
  { key: 'company_city', label: 'Company City', aliases: ['Company City'] },
  { key: 'company_state', label: 'Company State', aliases: ['Company State'] },
  { key: 'company_country', label: 'Company Country', aliases: ['Company Country'] },
  { key: 'company_phone', label: 'Company Phone', aliases: ['Company Phone'] },
  { key: 'technologies', label: 'Technologies', aliases: ['Technologies'] },
  { key: 'annual_revenue', label: 'Annual Revenue', aliases: ['Annual Revenue'] },
  { key: 'total_funding', label: 'Total Funding', aliases: ['Total Funding'] },
  { key: 'latest_funding', label: 'Latest Funding', aliases: ['Latest Funding'] },
  { key: 'latest_funding_amount', label: 'Latest Funding Amount', aliases: ['Latest Funding Amount'] },
  { key: 'last_raised_at', label: 'Last Raised At', aliases: ['Last Raised At'] },
  { key: 'sent_at', label: 'sent_at', aliases: ['sent_at'] },
  { key: 'status', label: 'status', aliases: ['status'] }
]

const REQUIRED_IMPORT_COLUMN_NAMES = REQUIRED_IMPORT_COLUMNS.map((column) => column.label)

// Apollo form used to collect country and product name

function normalizeFieldName(value: string) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '')
}

function normalizeRows(rows: any[]): LeadRow[] {
  function normalizeKeys(obj: any) {
    const out: Record<string, any> = {}
    Object.keys(obj || {}).forEach((k) => {
      const nk = normalizeFieldName(k)
      out[nk] = obj[k]
    })
    return out
  }

  function findByKeys(obj: any, keys: string[], substrFallback?: string) {
    for (const key of keys.map((item) => normalizeFieldName(item))) {
      if (obj[key] != null && obj[key] !== '') return obj[key]
    }
    if (substrFallback) {
      const fallback = normalizeFieldName(substrFallback)
      const found = Object.keys(obj).find((kk) => normalizeFieldName(kk).includes(fallback))
      if (found) return obj[found]
    }
    return undefined
  }

  return rows
    .map((row) => {
      const nr = normalizeKeys(row)
      return {
        email: findByKeys(nr, ['Email'], 'Email'),
        first_name: findByKeys(nr, ['First Name'], 'First Name'),
        last_name: findByKeys(nr, ['Last Name'], 'Last Name'),
        title: findByKeys(nr, ['Title'], 'Title'),
        company_name: findByKeys(nr, ['Company Name'], 'Company Name'),
        company_linkedin_url: findByKeys(nr, ['Company Linkedin Url'], 'Company Linkedin Url'),
        company_domain: findByKeys(nr, ['Company Domain'], 'Company Domain'),
        website: findByKeys(nr, ['Website'], 'Website'),
        linkedin_url: findByKeys(nr, ['Person Linkedin Url'], 'Person Linkedin Url'),
        facebook_url: findByKeys(nr, ['Facebook Url'], 'Facebook Url'),
        twitter_url: findByKeys(nr, ['Twitter Url'], 'Twitter Url'),
        city: findByKeys(nr, ['City'], 'City'),
        state: findByKeys(nr, ['State'], 'State'),
        country: findByKeys(nr, ['Country'], 'Country'),
        company_address: findByKeys(nr, ['Company Address'], 'Company Address'),
        company_city: findByKeys(nr, ['Company City'], 'Company City'),
        company_state: findByKeys(nr, ['Company State'], 'Company State'),
        company_country: findByKeys(nr, ['Company Country'], 'Company Country'),
        company_phone: findByKeys(nr, ['Company Phone'], 'Company Phone'),
        technologies: findByKeys(nr, ['Technologies'], 'Technologies'),
        industry: findByKeys(nr, ['Industry'], 'Industry'),
        employees: findByKeys(nr, ['# Employees'], '# Employees'),
        annual_revenue: findByKeys(nr, ['Annual Revenue'], 'Annual Revenue'),
        total_funding: findByKeys(nr, ['Total Funding'], 'Total Funding'),
        latest_funding: findByKeys(nr, ['Latest Funding'], 'Latest Funding'),
        latest_funding_amount: findByKeys(nr, ['Latest Funding Amount'], 'Latest Funding Amount'),
        last_raised_at: findByKeys(nr, ['Last Raised At'], 'Last Raised At'),
        sent_at: findByKeys(nr, ['sent_at'], 'sent_at'),
        status: findByKeys(nr, ['status'], 'status')
      }
    })
    .filter((row) => Boolean(row.email))
}

function normalizeHeaderName(value: string) {
  return normalizeFieldName(value)
}

const LOCAL_COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria',
  'Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
  'Côte d\'Ivoire','Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
  'Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France',
  'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
  'Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar',
  'Republic of the Congo','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
  'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
]

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
  const [countryOptions, setCountryOptions] = useState<string[]>([])
  const [isCountryOpen, setIsCountryOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const comboboxRef = React.useRef<HTMLDivElement | null>(null)
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

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('https://restcountries.com/v3.1/all')
        const data = await res.json()
        if (!mounted) return
        const names = (data || [])
          .map((d: any) => d?.name?.common)
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b))
        if (names && names.length) {
          setCountryOptions(names)
          return
        }
        // fallback to embedded list if remote fetch returned nothing
        setCountryOptions(LOCAL_COUNTRIES)
      } catch (e) {
        // fetch failed — fallback to embedded list
        setCountryOptions(LOCAL_COUNTRIES)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const filteredCountries = React.useMemo(() => {
    const q = apolloMarketName.trim().toLowerCase()
    if (!q) return countryOptions
    return countryOptions.filter((c) => c.toLowerCase().includes(q)).slice(0, 200)
  }, [countryOptions, apolloMarketName])

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!comboboxRef.current) return
      if (!comboboxRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false)
        setHighlightedIndex(-1)
      }
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

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

  const missingRequiredHeaders = useMemo(() => {
    return REQUIRED_IMPORT_COLUMNS.filter((column) => {
      return !fileHeaders.some((header) =>
        column.aliases.some((alias) => normalizeHeaderName(alias) === normalizeHeaderName(header))
      )
    }).map((column) => column.label)
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

    if (missingRequiredHeaders.length) {
      toast.error(`Missing required columns: ${missingRequiredHeaders.join(', ')}`)
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
      toast.error('Country is required')
      return
    }

    if (!apolloProductName.trim()) {
      toast.error('Product name is required')
      return
    }

    setApolloSubmitting(true)
    try {
      const response = await fetch('/api/leads/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_name: apolloMarketName.trim().toLowerCase(),
          product_name: apolloProductName.trim(),
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
                    Match the sheet column names with the required names below. Every column in the list is mandatory for import.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {REQUIRED_IMPORT_COLUMNS.map((column) => (
                      <button
                        key={column.key}
                        type="button"
                        onClick={async () => {
                          await copyToClipboard(column.label)
                          toast.success(`Copied ${column.label}`)
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
                      >
                        Copy {column.label}
                      </button>
                    ))}
                  </div>
                  {missingRequiredHeaders.length ? (
                    <div className="mt-3 rounded-md border border-red-200 bg-white px-3 py-2 text-red-900">
                      Missing required columns: {missingRequiredHeaders.join(', ')}
                    </div>
                  ) : null}
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
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Country</span>
                  <div ref={comboboxRef} className="relative">
                    <input
                      name="market_name"
                      aria-autocomplete="list"
                      aria-expanded={isCountryOpen}
                      aria-controls="countries-listbox"
                      role="combobox"
                      value={apolloMarketName}
                      onChange={(e) => {
                        setApolloMarketName(e.target.value)
                        setIsCountryOpen(true)
                        setHighlightedIndex(0)
                      }}
                      onFocus={() => {
                        setIsCountryOpen(true)
                        setHighlightedIndex(0)
                      }}
                      onKeyDown={(e) => {
                        if (!isCountryOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                          setIsCountryOpen(true)
                          setHighlightedIndex(0)
                          e.preventDefault()
                          return
                        }
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setHighlightedIndex((hi) => Math.min(hi + 1, filteredCountries.length - 1))
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setHighlightedIndex((hi) => Math.max(hi - 1, 0))
                        } else if (e.key === 'Enter') {
                          e.preventDefault()
                          const sel = filteredCountries[highlightedIndex] || filteredCountries[0]
                          if (sel) {
                            setApolloMarketName(sel)
                            setIsCountryOpen(false)
                            setHighlightedIndex(-1)
                          }
                        } else if (e.key === 'Escape') {
                          setIsCountryOpen(false)
                          setHighlightedIndex(-1)
                        }
                      }}
                      className="w-full rounded-lg border px-3 py-2"
                      placeholder="Type to search countries"
                    />
                    {isCountryOpen && filteredCountries.length > 0 && (
                      <ul
                        id="countries-listbox"
                        role="listbox"
                        className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow-lg"
                      >
                        {filteredCountries.map((c, idx) => (
                          <li
                            key={c}
                            role="option"
                            aria-selected={highlightedIndex === idx}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => {
                              setApolloMarketName(c)
                              setIsCountryOpen(false)
                              setHighlightedIndex(-1)
                            }}
                            className={
                              'cursor-pointer px-3 py-2 ' +
                              (highlightedIndex === idx ? 'bg-sky-100' : '')
                            }
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
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
              </div>

              

              <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                This will send a webhook with the selected country, product name, and selected campaign ID.
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
              Make sure your sheet columns match the lowercase names below. Use the copy button to copy all column names at once and paste them into your sheet.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await copyToClipboard(REQUIRED_IMPORT_COLUMN_NAMES.join('\t'))
                  toast.success('Copied all column names')
                }}
                className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
              >
                Copy all column names
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {REQUIRED_IMPORT_COLUMN_NAMES.map((columnName) => (
                <span
                  key={columnName}
                  className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
                >
                  {columnName}
                </span>
              ))}
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
              disabled={uploading || !rows.length || !selectedCampaignId || missingRequiredHeaders.length > 0}
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
