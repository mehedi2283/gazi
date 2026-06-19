"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { Building2, Calendar, ChevronDown, ListOrdered, Loader2, Plus, Settings, Trash2, UserCircle, Users, X } from 'lucide-react'
import { DEFAULT_TIMEZONE, INSTANTLY_TIMEZONES } from '../../lib/timezones'

type LeadSource = 'external' | 'import'
type StepType = 'connection_request' | 'follow_up_message'
type Tab = typeof TABS[number]

type SequenceStep = {
  day_delay: number
  step_type: StepType
  message: string
}

type HeyReachAccount = {
  id: string
  name: string
  email: string
}

type LinkedCampaignProps = {
  hideSubmit?: boolean
  onSuccess?: () => void
}

export type LinkedCampaignHandle = {
  validate: () => boolean
  submit: () => Promise<void>
}

const TABS = ['Basics', 'Campaign Owner', 'Schedule', 'Sender Profile', 'Sequences', 'Leads'] as const

const LEAD_MODE_OPTIONS: Array<{ value: LeadSource; label: string; description: string }> = [
  { value: 'external', label: 'External', description: 'Send country and product data to GaziAI Buyer Discovery' },
  { value: 'import', label: 'Import', description: 'Upload a CSV or spreadsheet of leads. Ensure LinkedIn Profile URL column is included.' }
]

const COUNTRY_OPTIONS = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina',
  'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China',
  'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Honduras',
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg', 'Malaysia', 'Mexico', 'Morocco',
  'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Panama', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain',
  'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Tunisia', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'Uruguay', 'Venezuela', 'Vietnam', 'Zimbabwe'
]

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours24 = Math.floor(index / 2)
  const minutes = index % 2 === 0 ? '00' : '30'
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = ((hours24 + 11) % 12) + 1

  return {
    value: `${String(hours24).padStart(2, '0')}:${minutes}`,
    label: `${hours12}:${minutes} ${period}`
  }
})

const TIME_OPTIONS_WITH_2359 = [...TIME_OPTIONS, { value: '23:59', label: '11:59 PM' }]

function normalizeColumnName(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function hasLinkedInColumn(rows: Record<string, any>[]) {
  if (!rows.length) return false
  const headers = Object.keys(rows[0]).map(normalizeColumnName)
  return headers.some((header) => (
    header === 'linkedin_url' ||
    header === 'linkedin_profile_url' ||
    header === 'person_linkedin_url' ||
    header === 'profile_url' ||
    header.includes('linkedin')
  ))
}

function getMessageVariable(stepNumber: number) {
  return `{{personalization_${stepNumber}}}`
}

function getSequenceError(steps: SequenceStep[]) {
  if (steps.length < 2) return 'One connection request and one follow-up message are required.'
  if (steps[0]?.step_type !== 'connection_request') return 'The first sequence step must be a connection request.'
  if (steps[1]?.step_type !== 'follow_up_message') return 'The second sequence step must be a follow-up message.'
  if (steps[0]?.day_delay !== 0) return 'Connection request day delay must be 0.'
  if (steps[1]?.day_delay !== 0) return 'First follow-up day delay must be 0.'

  for (let index = 2; index < steps.length; index += 1) {
    const current = steps[index]?.day_delay
    const previous = steps[index - 1]?.day_delay

    if (!Number.isFinite(current) || current < 0) return `Step ${index + 1} day must be 0 or greater.`
    if (current <= previous) return `Step ${index + 1} day must be greater than Step ${index}.`
  }

  return ''
}

function fieldClass(extra = '') {
  return `w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium ${extra}`
}

const LinkedCampaign = React.forwardRef<LinkedCampaignHandle, LinkedCampaignProps>(function LinkedCampaign({ hideSubmit = false, onSuccess }, ref) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Basics')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [targetLeadCount, setTargetLeadCount] = useState('100')
  const [dailyLimit, setDailyLimit] = useState('50')
  const [actionGap, setActionGap] = useState('10')
  const [stopOnReply, setStopOnReply] = useState(true)
  const [campaignOwner, setCampaignOwner] = useState({ company_name: '', created_from_company: '' })
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE)
  const [timezoneOpen, setTimezoneOpen] = useState(false)
  const [timezoneSearch, setTimezoneSearch] = useState('')
  const [fromTime, setFromTime] = useState('09:00')
  const [toTime, setToTime] = useState('17:00')
  const [timePickerOpen, setTimePickerOpen] = useState<null | 'from' | 'to'>(null)
  const [days, setDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false
  })
  const [senderInfo, setSenderInfo] = useState({
    name: '',
    report_email: '',
    company: '',
    location: '',
    booking_calendar_link: '',
    company_details: '',
    linkedin_profile_url: ''
  })
  const [steps, setSteps] = useState<SequenceStep[]>([
    { day_delay: 0, step_type: 'connection_request', message: '' },
    { day_delay: 0, step_type: 'follow_up_message', message: getMessageVariable(2) },
    { day_delay: 1, step_type: 'follow_up_message', message: getMessageVariable(3) },
    { day_delay: 2, step_type: 'follow_up_message', message: getMessageVariable(4) },
    { day_delay: 3, step_type: 'follow_up_message', message: getMessageVariable(5) }
  ])
  const [leadMode, setLeadMode] = useState<LeadSource>('external')
  const [leadRows, setLeadRows] = useState<Record<string, any>[]>([])
  const [leadFileName, setLeadFileName] = useState('')
  const [leadFileError, setLeadFileError] = useState('')
  const [heyReachAccountIdInput, setHeyReachAccountIdInput] = useState('')
  const [addingHeyReachAccount, setAddingHeyReachAccount] = useState(false)
  const [selectedHeyReachAccount, setSelectedHeyReachAccount] = useState<HeyReachAccount | null>(null)
  const [externalLead, setExternalLead] = useState({ market_name: '', product_name: '' })
  const [countryOpen, setCountryOpen] = useState(false)
  const [countryHighlight, setCountryHighlight] = useState(0)

  const countryRef = useRef<HTMLDivElement | null>(null)
  const timezoneRef = useRef<HTMLDivElement | null>(null)
  const timePickerRef = useRef<HTMLDivElement | null>(null)

  const filteredCountries = useMemo(() => {
    const query = externalLead.market_name.trim().toLowerCase()
    if (!query) return COUNTRY_OPTIONS
    return COUNTRY_OPTIONS.filter((country) => country.toLowerCase().includes(query))
  }, [externalLead.market_name])

  const filteredTimezones = useMemo(() => {
    const query = timezoneSearch.trim().toLowerCase()
    if (!query) return INSTANTLY_TIMEZONES
    return INSTANTLY_TIMEZONES.filter((tz) => tz.toLowerCase().includes(query))
  }, [timezoneSearch])

  const sequenceError = useMemo(() => getSequenceError(steps), [steps])

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (countryRef.current && !countryRef.current.contains(target)) setCountryOpen(false)
      if (timezoneRef.current && !timezoneRef.current.contains(target)) setTimezoneOpen(false)
      if (timePickerRef.current && !timePickerRef.current.contains(target)) setTimePickerOpen(null)
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function setSenderField(field: keyof typeof senderInfo, value: string) {
    setSenderInfo((current) => ({ ...current, [field]: value }))
  }

  function toggleDay(day: keyof typeof days) {
    setDays((current) => ({ ...current, [day]: !current[day] }))
  }

  function addStep() {
    setSteps((current) => [
      ...current,
      {
        day_delay: Math.max(1, (current[current.length - 1]?.day_delay ?? 0) + 1),
        step_type: 'follow_up_message',
        message: getMessageVariable(current.length + 1)
      }
    ])
  }

  function removeStep(index: number) {
    setSteps((current) => index <= 1 ? current : current.filter((_, stepIndex) => stepIndex !== index))
  }

  function updateStep(index: number, patch: Partial<SequenceStep>) {
    setSteps((current) => current.map((step, stepIndex) => {
      if (stepIndex !== index) return step
      const next = { ...step, ...patch }
      if (stepIndex <= 1) next.day_delay = 0
      return next
    }))
  }

  function updateDelay(index: number, value: string) {
    setSteps((current) => current.map((step, stepIndex) => {
      if (stepIndex !== index) return step
      if (stepIndex <= 1) return { ...step, day_delay: 0 }
      const minimum = (current[stepIndex - 1]?.day_delay ?? 0) + 1
      const parsed = Number(value)
      return { ...step, day_delay: Number.isFinite(parsed) ? Math.max(minimum, parsed) : minimum }
    }))
  }

  async function handleAddHeyReachAccount() {
    const accountId = heyReachAccountIdInput.trim()
    if (!accountId) return

    if (!/^\d+$/.test(accountId)) {
      toast.error('Please enter a numeric HeyReach account ID')
      return
    }

    setAddingHeyReachAccount(true)
    try {
      const lookupUrl = `/api/heyreach/accounts?accountId=${encodeURIComponent(accountId)}`
      let res = await fetch(lookupUrl, { credentials: 'same-origin' })

      if (res.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin'
        })

        if (refreshRes.ok) {
          res = await fetch(lookupUrl, { credentials: 'same-origin' })
        }
      }

      const json = await res.json()

      if (!res.ok || json.error || !json.data) {
        throw new Error(json.error || 'HeyReach account was not found')
      }

      setSelectedHeyReachAccount({
        id: String(json.data.id || accountId),
        name: String(json.data.name || `Account ${accountId}`),
        email: String(json.data.email || '')
      })
      setHeyReachAccountIdInput('')
      setError('')
      toast.success('HeyReach account added')
    } catch (err: any) {
      toast.error(err?.message || 'Unable to verify HeyReach account')
    } finally {
      setAddingHeyReachAccount(false)
    }
  }

  function handleLeadFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLeadFileError('')
    setLeadFileName(file.name)
    const reader = new FileReader()

    reader.onload = (readerEvent) => {
      const content = readerEvent.target?.result
      if (typeof content !== 'string') return

      let rows: Record<string, any>[] = []

      try {
        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
          const parsed = Papa.parse(content, { header: true, skipEmptyLines: true })
          rows = parsed.data as Record<string, any>[]
        } else {
          const workbook = XLSX.read(content, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[]
        }

        if (!hasLinkedInColumn(rows)) {
          setLeadRows([])
          setLeadFileError('LinkedIn Profile URL column is required.')
          toast.error('LinkedIn Profile URL column is required')
          return
        }

        setLeadRows(rows)
        toast.success(`${rows.length} rows loaded successfully`)
      } catch (err: any) {
        setLeadRows([])
        setLeadFileError(err?.message || 'Unable to read file')
        toast.error(err?.message || 'Unable to read file')
      }
    }

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.readAsText(file)
    } else {
      reader.readAsBinaryString(file)
    }
  }

  function validateForm() {
    setError('')

    const requiredError =
      !name.trim() ? 'Campaign name is required' :
      !campaignOwner.company_name.trim() || !campaignOwner.created_from_company.trim() ? 'Campaign owner details are required' :
      !senderInfo.name.trim() || !senderInfo.company.trim() || !senderInfo.location.trim() || !senderInfo.booking_calendar_link.trim() || !senderInfo.linkedin_profile_url.trim() ? 'Complete sender profile details are required' :
      !selectedHeyReachAccount ? 'Add a verified HeyReach account before launching' :
      leadMode === 'external' && (!externalLead.market_name.trim() || !externalLead.product_name.trim()) ? 'Country and product name are required for External lead creation' :
      leadMode === 'import' && !leadRows.length ? 'Upload a CSV or spreadsheet before launching imported LinkedIn leads' :
      sequenceError

    if (requiredError) {
      setError(requiredError)
      return false
    }

    return true
  }

  async function submitForm(throwErrors = false) {
    setSubmitting(true)
    setError('')

    if (!validateForm()) {
      setSubmitting(false)
      return
    }

    const payload = {
      campaign_name: name.trim(),
      target_lead_count: Number(targetLeadCount || 0),
      daily_limit: Number(dailyLimit || 0),
      action_gap_mins: Number(actionGap || 0),
      stop_on_reply: stopOnReply,
      company_name: campaignOwner.company_name.trim(),
      creator: campaignOwner.created_from_company.trim(),
      timezone,
      from_time: fromTime,
      to_time: toTime,
      sending_days: Object.entries(days).filter(([, enabled]) => enabled).map(([day]) => day),
      sender_name: senderInfo.name.trim(),
      report_email: senderInfo.report_email.trim(),
      company: senderInfo.company.trim(),
      location: senderInfo.location.trim(),
      client_email: null,
      calendly_token: null,
      booking_calendar_link: senderInfo.booking_calendar_link.trim(),
      company_details: senderInfo.company_details.trim(),
      linkedin_profile_url: senderInfo.linkedin_profile_url.trim(),
      heyreach_account_id: selectedHeyReachAccount?.id || null,
      heyreach_account: selectedHeyReachAccount,
      sequences: steps.map((step, index) => ({
        step: index + 1,
        step_type: index === 0 ? 'connection_request' : 'follow_up_message',
        message: getMessageVariable(index + 1),
        day_delay: index <= 1 ? 0 : step.day_delay
      })),
      lead_source: leadMode,
      lead_request: leadMode === 'external'
        ? {
            market_name: externalLead.market_name.trim().toLowerCase(),
            product_name: externalLead.product_name.trim()
          }
        : null,
      leads_csv: leadMode === 'import'
        ? {
            file_name: leadFileName,
            total_rows: leadRows.length,
            rows: leadRows
          }
        : null,
      channel: 'linkedin_outreach',
      campaign_type: 'linkedin_outreach'
    }

    try {
      const res = await fetch('/api/campaigns/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || json.error || 'Unable to launch LinkedIn campaign')
      }

      toast.success('LinkedIn campaign sent')
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/campaigns')
        router.refresh()
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to launch LinkedIn campaign')
      if (throwErrors) throw err
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitForm()
  }

  React.useImperativeHandle(ref, () => ({
    validate: validateForm,
    submit: () => submitForm(true)
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">New LinkedIn Campaign</h1>
        <p className="mt-1 text-zinc-500">Create an AI-personalized LinkedIn outreach sequence.</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur">
        {(
          [
            { id: 'Basics', icon: Settings },
            { id: 'Campaign Owner', icon: Building2 },
            { id: 'Schedule', icon: Calendar },
            { id: 'Sender Profile', icon: UserCircle },
            { id: 'Sequences', icon: ListOrdered },
            { id: 'Leads', icon: Users }
          ] as const
        ).map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-indigo-600 bg-indigo-50 font-bold border border-indigo-100 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-850'
              }`}
            >
              <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-100 text-slate-400 group-hover:text-slate-650'
              }`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="relative z-10 whitespace-nowrap">{tab.id}</span>
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl">
        <div className="min-h-[400px]">
          {activeTab === 'Basics' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Basic Configuration</h2>
                <p className="text-sm text-slate-400 font-medium">Configure the primary settings and limits for this campaign.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Campaign Name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass()} placeholder="GaziAI LinkedIn Outreach 1" />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Target Lead Count</span>
                  <input type="number" min={0} value={targetLeadCount} onChange={(event) => setTargetLeadCount(event.target.value)} className={fieldClass()} placeholder="100" />
                  <p className="text-xs text-slate-400 font-medium">Total number of leads to fetch</p>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Daily Limit</span>
                    <input type="number" min={1} value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} className={fieldClass()} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Action Gap (mins)</span>
                    <input type="number" min={0} value={actionGap} onChange={(event) => setActionGap(event.target.value)} className={fieldClass()} />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-750 transition hover:bg-slate-50 cursor-pointer shadow-sm">
                  <input type="checkbox" checked={stopOnReply} onChange={(event) => setStopOnReply(event.target.checked)} className="h-4 w-4 rounded border-slate-350 bg-transparent text-indigo-650 focus:ring-indigo-500/20" />
                  <span className="text-sm font-bold">Stop On Reply</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Campaign Owner' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Campaign Owner</h2>
                <p className="text-sm text-slate-400 font-medium">Define the company and creator shown on this campaign.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Company Name</span>
                  <input value={campaignOwner.company_name} onChange={(event) => setCampaignOwner((current) => ({ ...current, company_name: event.target.value }))} className={fieldClass()} placeholder="Gazi AI" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Creator</span>
                  <input value={campaignOwner.created_from_company} onChange={(event) => setCampaignOwner((current) => ({ ...current, created_from_company: event.target.value }))} className={fieldClass()} placeholder="Campaign creator" />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Schedule' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Sending Schedule</h2>
                <p className="text-sm text-slate-400 font-medium">Set the delivery window and active sending days.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <label className="space-y-2 md:col-span-3">
                  <span className="text-sm font-semibold text-slate-700">Timezone</span>
                  <div ref={timezoneRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setTimezoneOpen((current) => !current)
                        setTimezoneSearch('')
                      }}
                      className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-slate-850 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    >
                      <span className="font-medium">{timezone}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>
                    {timezoneOpen && (
                      <div className="absolute z-30 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-xl">
                        <input value={timezoneSearch} onChange={(event) => setTimezoneSearch(event.target.value)} className="w-full border-b border-slate-100 px-3 py-2 text-sm outline-none" placeholder="Search timezone..." />
                        <div className="max-h-64 overflow-auto py-1">
                          {filteredTimezones.slice(0, 120).map((tz) => (
                            <button key={tz} type="button" onClick={() => { setTimezone(tz); setTimezoneOpen(false) }} className={`block w-full px-3 py-2 text-left text-sm font-medium transition hover:bg-indigo-50 ${timezone === tz ? 'bg-indigo-50 text-indigo-700' : 'text-slate-650'}`}>
                              {tz}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">From</span>
                  <select value={fromTime} onChange={(event) => setFromTime(event.target.value)} className={fieldClass()}>
                    {TIME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">To</span>
                  <select value={toTime} onChange={(event) => setToTime(event.target.value)} className={fieldClass()}>
                    {TIME_OPTIONS_WITH_2359.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(days) as Array<keyof typeof days>).map((day) => (
                  <label key={day} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-750 transition hover:bg-slate-50 cursor-pointer shadow-sm">
                    <input type="checkbox" checked={days[day]} onChange={() => toggleDay(day)} className="h-4 w-4 rounded border-slate-350 bg-transparent text-indigo-650 focus:ring-indigo-500/20" />
                    <span className="text-sm font-bold capitalize">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Sender Profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Sender Profile</h2>
                <p className="text-sm text-slate-400 font-medium">Personalize the LinkedIn sender and reporting details.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Sender Name</span>
                  <input value={senderInfo.name} onChange={(event) => setSenderField('name', event.target.value)} className={fieldClass()} placeholder="Sender name" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Report Email</span>
                  <input type="email" value={senderInfo.report_email} onChange={(event) => setSenderField('report_email', event.target.value)} className={fieldClass()} placeholder="reports@company.com" />
                  <p className="text-xs text-slate-400 font-medium">Weekly reports will be sent here.</p>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Company</span>
                  <input value={senderInfo.company} onChange={(event) => setSenderField('company', event.target.value)} className={fieldClass()} placeholder="Company name" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Location</span>
                  <input value={senderInfo.location} onChange={(event) => setSenderField('location', event.target.value)} className={fieldClass()} placeholder="City, Country" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Booking Calendar Link</span>
                  <input value={senderInfo.booking_calendar_link} onChange={(event) => setSenderField('booking_calendar_link', event.target.value)} className={fieldClass()} placeholder="https://cal.com/..." />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Sender LinkedIn Profile</span>
                  <input value={senderInfo.linkedin_profile_url} onChange={(event) => setSenderField('linkedin_profile_url', event.target.value)} className={fieldClass()} placeholder="https://linkedin.com/in/yourprofile" />
                  <p className="text-xs text-slate-400 font-medium">The LinkedIn account that will be used for outreach.</p>
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Company Details</span>
                  <textarea value={senderInfo.company_details} onChange={(event) => setSenderField('company_details', event.target.value)} className={fieldClass('min-h-24')} placeholder="Describe your company, offer, and relevant context." />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Sequences' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Sequence Steps</h2>
                  <p className="text-sm text-slate-400 font-medium">Configure delays for your automated LinkedIn outreach steps.</p>
                </div>
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => {
                  const stepNumber = index + 1
                  const isConnectionRequest = index === 0
                  const isRequiredZeroDelayStep = index <= 1
                  const stepLabel = isConnectionRequest ? 'Connection Request' : 'Follow-up Message'
                  const stepTitle = isConnectionRequest ? 'Connection Request' : `Follow-up ${index}`
                  return (
                    <div key={stepNumber} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">{stepTitle}</h3>
                          {isRequiredZeroDelayStep && (
                            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold uppercase text-indigo-600">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-[220px_1fr_180px]">
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Step Type</span>
                          <span className="inline-flex min-h-10 w-full items-center rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 shadow-sm">
                            {stepLabel}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Message</span>
                          <div className="min-h-24 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold leading-relaxed text-slate-600 shadow-inner">
                            {isConnectionRequest
                              ? 'AI will automatically generate a personalized connection request for each lead.'
                              : 'AI will automatically generate a personalized follow-up message for each lead.'}
                          </div>
                        </div>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Day Delay</span>
                          <input
                            type="number"
                            min={isRequiredZeroDelayStep ? 0 : (steps[index - 1]?.day_delay ?? 0) + 1}
                            value={isRequiredZeroDelayStep ? 0 : step.day_delay}
                            disabled={isRequiredZeroDelayStep}
                            onChange={(event) => updateDelay(index, event.target.value)}
                            className={fieldClass('disabled:bg-slate-50 disabled:text-slate-400')}
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>

              {sequenceError && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-250 font-semibold shadow-sm">{sequenceError}</div>}

              <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-inner">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Launch Preview</h3>
                <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 font-bold bg-slate-50/70">
                      <tr>
                        <th className="px-4 py-3">Step</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Day</th>
                        <th className="px-4 py-3">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {steps.map((step, index) => (
                        <tr key={`preview-${index}`} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-2.5 font-semibold text-slate-700">{index === 0 ? 'Connection Request' : `Follow-up ${index}`}</td>
                          <td className="px-4 py-2.5 text-slate-600 font-medium">{index === 0 ? 'Connection Request' : 'Follow-up Message'}</td>
                          <td className="px-4 py-2.5 text-indigo-650 font-bold font-mono">{index <= 1 ? 0 : step.day_delay}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{index === 0 ? 'AI-generated personalized connection request' : 'AI-generated personalized follow-up message'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Leads' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Leads</h2>
                <p className="text-sm text-slate-400 font-medium">Configure how LinkedIn prospects are added to this campaign.</p>
              </div>

              <div className="space-y-3">
                <span className="text-sm font-semibold text-slate-700">HeyReach Account</span>
                <div className="flex flex-col gap-3">
                  <div className="flex max-w-md gap-3">
                    <input
                      type="number"
                      min={1}
                      value={heyReachAccountIdInput}
                      onChange={(event) => setHeyReachAccountIdInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleAddHeyReachAccount()
                        }
                      }}
                      placeholder="Enter HeyReach account ID"
                      className={fieldClass()}
                    />
                    <button
                      type="button"
                      onClick={handleAddHeyReachAccount}
                      disabled={addingHeyReachAccount || !heyReachAccountIdInput.trim()}
                      className="inline-flex h-10 min-w-[72px] items-center justify-center rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {addingHeyReachAccount ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        'Add'
                      )}
                    </button>
                  </div>

                  {selectedHeyReachAccount ? (
                    <div className="flex flex-wrap gap-2 max-w-2xl pt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 border border-indigo-200 py-1 pl-3 pr-2 text-xs font-semibold text-indigo-700 shadow-sm">
                        <span className="truncate max-w-[320px]" title={`${selectedHeyReachAccount.name}${selectedHeyReachAccount.email ? ` - ${selectedHeyReachAccount.email}` : ''}`}>
                          {selectedHeyReachAccount.name}
                          {selectedHeyReachAccount.email ? ` - ${selectedHeyReachAccount.email}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedHeyReachAccount(null)}
                          className="rounded-full p-0.5 transition hover:bg-indigo-100 hover:text-indigo-900"
                          aria-label="Remove HeyReach account"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Lead Source</h3>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  {LEAD_MODE_OPTIONS.map((option) => (
                    <label key={option.value} className={`relative flex cursor-pointer rounded-xl border p-4 transition-all ${leadMode === option.value ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-350 shadow-sm'}`}>
                      <input type="radio" name="lead_mode" className="sr-only" checked={leadMode === option.value} onChange={() => setLeadMode(option.value)} />
                      <div className="flex w-full items-start gap-4">
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${leadMode === option.value ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-transparent'}`}>
                          {leadMode === option.value && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{option.label}</div>
                          <div className="mt-1 text-sm text-slate-500 font-medium">{option.description}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {leadMode === 'external' && (
                  <div className="grid gap-6 md:grid-cols-2 animate-in fade-in duration-300 p-5 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Target Country</span>
                      <div ref={countryRef} className="relative">
                        <input value={externalLead.market_name} onChange={(event) => { setExternalLead((current) => ({ ...current, market_name: event.target.value })); setCountryOpen(true); setCountryHighlight(0) }} onFocus={() => setCountryOpen(true)} className={fieldClass()} placeholder="e.g. United States" />
                        {countryOpen && filteredCountries.length > 0 && (
                          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
                            {filteredCountries.slice(0, 100).map((country, index) => (
                              <li key={country} onMouseEnter={() => setCountryHighlight(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => { setExternalLead((current) => ({ ...current, market_name: country })); setCountryOpen(false) }} className={`cursor-pointer px-3 py-2 text-sm font-medium ${index === countryHighlight ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-650 hover:bg-slate-50'}`}>
                                {country}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Product / Offering Name</span>
                      <input value={externalLead.product_name} onChange={(event) => setExternalLead((current) => ({ ...current, product_name: event.target.value }))} className={fieldClass()} placeholder="e.g. AI CRM Automation" />
                    </label>
                  </div>
                )}

                {leadMode === 'import' && (
                  <div className="space-y-4 animate-in fade-in duration-300 p-5 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
                    <label className="space-y-2 block">
                      <span className="text-sm font-semibold text-slate-700">Upload CSV or Spreadsheet</span>
                      <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleLeadFileChange} className={fieldClass()} />
                    </label>

                    {leadFileError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-bold text-red-700">
                          <X className="h-4 w-4 text-red-500 shrink-0" />
                          {leadFileError}
                        </div>
                      </div>
                    )}

                    {leadFileName && !leadFileError && (
                      <div className="flex items-center gap-3 rounded-md border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-bold shadow-sm">
                        <span className="font-semibold">{leadFileName}</span>
                        <span className="text-emerald-600/80">- {leadRows.length} rows loaded</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-750 border border-red-200 flex items-center gap-2 font-semibold shadow-sm">
            <span className="font-extrabold text-red-800">Error:</span> {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
          <div className="flex items-center gap-2">
            {activeTab !== 'Basics' && (
              <button type="button" onClick={() => setActiveTab(TABS[Math.max(0, TABS.indexOf(activeTab) - 1)])} className="rounded-lg bg-white border border-slate-200 px-5 py-2.5 font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm">
                Previous
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeTab !== 'Leads' ? (
              <button type="button" onClick={() => setActiveTab(TABS[Math.min(TABS.length - 1, TABS.indexOf(activeTab) + 1)])} className="rounded-lg bg-white border border-slate-200 px-6 py-2.5 font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm">
                Next Step
              </button>
            ) : hideSubmit ? null : (
              <button type="submit" disabled={submitting || Boolean(sequenceError)} className="rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 px-8 py-2.5 font-extrabold text-white shadow-md shadow-indigo-600/10 transition hover:opacity-95 hover:shadow-indigo-600/20 disabled:opacity-60">
                {submitting ? 'Launching...' : 'Launch Campaign'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
})

export default LinkedCampaign
