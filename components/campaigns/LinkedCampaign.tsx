"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { Building2, Calendar, ChevronDown, Clock, ListOrdered, Loader2, Settings, UserCircle, Users, X, CheckCircle2, Search, UploadCloud, Plus, Mail } from 'lucide-react'
import { DEFAULT_TIMEZONE, INSTANTLY_TIMEZONES } from '../../lib/timezones'

type LeadSource = 'external' | 'import'
type StepType = 'connection_request' | 'follow_up_message'
type Tab = typeof TABS[number]

type SequenceStep = {
  day_delay: number
  delay?: number
  delay_unit?: 'days' | 'hours'
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

function formatTimeLabel(value: string) {
  const match = /^([0-2]\d):([0-5]\d)$/.exec(value)
  if (!match) return value
  const hours24 = Number(match[1])
  const minutes = match[2]
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = ((hours24 + 11) % 12) + 1
  return `${hours12}:${minutes} ${period}`
}

function getStepDelayInHours(step: SequenceStep, index: number): number {
  if (index === 0) return 0
  if (index === 1) return 3 // step 1 is fixed to 3 hours
  const unit = step.delay_unit || 'days'
  const val = step.delay !== undefined ? step.delay : step.day_delay
  return unit === 'days' ? val * 24 : val
}

function getSequenceError(steps: SequenceStep[]) {
  if (steps.length !== 5) return 'Sequence must have exactly 1 connection request and 4 follow-up messages.'
  if (steps[0]?.step_type !== 'connection_request') return 'The first sequence step must be a connection request.'
  if (steps[1]?.step_type !== 'follow_up_message') return 'The second sequence step must be a follow-up message.'
  if (steps[0]?.day_delay !== 0) return 'Connection request day delay must be 0.'

  for (let index = 2; index < steps.length; index += 1) {
    const step = steps[index]
    const val = step.delay !== undefined ? step.delay : step.day_delay
    const unit = step.delay_unit || 'days'

    if (!Number.isFinite(val) || val < 0) {
      return `Step ${index + 1} delay must be 0 or greater.`
    }

    if (unit === 'hours' && val < 3) {
      return `Step ${index + 1} delay must be at least 3 hours.`
    }

    const currentHours = getStepDelayInHours(step, index)
    const previousHours = getStepDelayInHours(steps[index - 1], index - 1)

    if (currentHours < previousHours) {
      const prevStepLabel = index - 1 === 1 ? '3 hours' : `${steps[index - 1].delay ?? steps[index - 1].day_delay} ${steps[index - 1].delay_unit || 'days'}`
      return `Step ${index + 1} delay must be at least ${prevStepLabel}.`
    }
  }

  return ''
}

const FIELD_CLASS = 'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-400'
const TEXTAREA_CLASS = 'min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
const SELECT_TRIGGER_CLASS = 'flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
const READONLY_FIELD_CLASS = 'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 shadow-inner'

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
    address: '',
    booking_calendar_link: '',
    company_details: '',
    linkedin_profile_url: ''
  })
  const [clientEmail, setClientEmail] = useState('')
  const [calendlyToken, setCalendlyToken] = useState('')
  const [existingTokens, setExistingTokens] = useState<Array<{ token: string; campaign_name: string }>>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [useExistingToken, setUseExistingToken] = useState(false)
  const [verifyingToken, setVerifyingToken] = useState(false)

  // Lookup existing tokens when client email changes
  useEffect(() => {
    const email = clientEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setExistingTokens([])
      return
    }

    const timeout = setTimeout(async () => {
      setLoadingTokens(true)
      try {
        const res = await fetch(`/api/campaigns/tokens?client_email=${encodeURIComponent(email)}`)
        const json = await res.json()

        if (json.data && json.data.length > 0) {
          setExistingTokens(json.data)
        } else {
          setExistingTokens([])
        }
      } catch {
        setExistingTokens([])
      } finally {
        setLoadingTokens(false)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [clientEmail])

  const [steps, setSteps] = useState<SequenceStep[]>([
    { day_delay: 0, delay: 0, delay_unit: 'days', step_type: 'connection_request', message: '' },
    { day_delay: 0, delay: 3, delay_unit: 'hours', step_type: 'follow_up_message', message: getMessageVariable(2) },
    { day_delay: 1, delay: 1, delay_unit: 'days', step_type: 'follow_up_message', message: getMessageVariable(3) },
    { day_delay: 2, delay: 2, delay_unit: 'days', step_type: 'follow_up_message', message: getMessageVariable(4) },
    { day_delay: 3, delay: 3, delay_unit: 'days', step_type: 'follow_up_message', message: getMessageVariable(5) }
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
  const fromTimeListRef = useRef<HTMLDivElement | null>(null)
  const toTimeListRef = useRef<HTMLDivElement | null>(null)

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

  // Auto-scroll to selected time when dropdown opens
  useEffect(() => {
    if (timePickerOpen === 'from' && fromTimeListRef.current) {
      const active = fromTimeListRef.current.querySelector('[data-active="true"]') as HTMLElement | null
      if (active) active.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
    if (timePickerOpen === 'to' && toTimeListRef.current) {
      const active = toTimeListRef.current.querySelector('[data-active="true"]') as HTMLElement | null
      if (active) active.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [timePickerOpen])

  function setSenderField(field: keyof typeof senderInfo, value: string) {
    setSenderInfo((current) => ({ ...current, [field]: value }))
  }

  function toggleDay(day: keyof typeof days) {
    setDays((current) => ({ ...current, [day]: !current[day] }))
  }

  // Steps are fixed: 1 connection request + 4 follow-ups. No add/remove allowed.

  function updateStep(index: number, patch: Partial<SequenceStep>) {
    setSteps((current) => current.map((step, stepIndex) => {
      if (stepIndex !== index) return step
      const next = { ...step, ...patch }
      if (stepIndex <= 1) next.day_delay = 0
      return next
    }))
  }

  function updateDelayValue(index: number, value: string) {
    setSteps((current) => current.map((step, stepIndex) => {
      if (stepIndex !== index) return step
      const parsed = Number(value)
      const val = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
      const unit = step.delay_unit || 'days'
      const dayDelay = unit === 'days' ? val : Math.floor(val / 24)

      return {
        ...step,
        delay: val,
        day_delay: dayDelay
      }
    }))
  }

  function updateDelayUnit(index: number, unit: 'days' | 'hours') {
    setSteps((current) => current.map((step, stepIndex) => {
      if (stepIndex !== index) return step
      const currentVal = step.delay !== undefined ? step.delay : step.day_delay
      let val = currentVal
      if (unit === 'hours' && val < 3) {
        val = 3
      } else if (unit === 'days' && val === 3 && step.delay_unit === 'hours') {
        val = 1
      }
      const dayDelay = unit === 'days' ? val : Math.floor(val / 24)

      return {
        ...step,
        delay_unit: unit,
        delay: val,
        day_delay: dayDelay
      }
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
      !senderInfo.name.trim() || !senderInfo.company.trim() || !senderInfo.location.trim() || !senderInfo.address.trim() || !senderInfo.booking_calendar_link.trim() || !calendlyToken.trim() || !clientEmail.trim() ? 'Complete sender profile details are required (including Address, Calendly Token, and Client Email)' :
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

    // Verify Calendly Token
    setVerifyingToken(true)
    try {
      const verifyRes = await fetch('/api/calendly/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: calendlyToken.trim() })
      })
      const verifyJson = await verifyRes.json()
      if (!verifyRes.ok || !verifyJson.ok) {
        throw new Error(verifyJson.error || 'This Calendly token is not available for use or expired')
      }
    } catch (err: any) {
      setError(err?.message || 'This Calendly token is not available for use or expired')
      setVerifyingToken(false)
      setSubmitting(false)
      return
    } finally {
      setVerifyingToken(false)
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
      client_email: clientEmail.trim() || null,
      calendly_token: calendlyToken.trim() || null,
      booking_calendar_link: senderInfo.booking_calendar_link.trim(),
      company_details: senderInfo.company_details.trim(),
      linkedin_profile_url: '',
      address: senderInfo.address.trim(),
      heyreach_account_id: selectedHeyReachAccount?.id || null,
      heyreach_account: selectedHeyReachAccount,
      sequences: steps.map((step, index) => ({
        step: index + 1,
        step_type: index === 0 ? 'connection_request' : 'follow_up_message',
        message: getMessageVariable(index + 1),
        day_delay: index === 1 ? 0 : (index === 0 ? 0 : step.day_delay),
        delay: index === 1 ? 3 : (index === 0 ? 0 : (step.delay !== undefined ? step.delay : step.day_delay)),
        delay_unit: index === 1 ? 'hours' : (index === 0 ? 'days' : (step.delay_unit || 'days'))
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

      <div className="flex min-h-[70px] flex-wrap items-center gap-2 rounded-3xl border border-slate-200/80 bg-white/85 p-2 shadow-glass backdrop-blur-xl">
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
          const tabId = tab.id
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={`group relative flex h-12 items-center gap-3 rounded-2xl border px-3 text-sm font-bold transition-colors ${
                activeTab === tabId
                  ? 'border-indigo-100 bg-white text-indigo-700 shadow-md shadow-indigo-500/10'
                  : 'border-transparent text-slate-500 shadow-none hover:border-slate-200 hover:bg-white hover:text-slate-900'
              }`}
            >
              <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTab === tabId
                  ? 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-700'
              }`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="relative z-10 whitespace-nowrap">{tabId}</span>
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-glass backdrop-blur-xl md:p-7">
        <div className="min-h-[400px]">
          {activeTab === 'Basics' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Basic Configuration</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Configure the primary settings and limits for this campaign.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Campaign Name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className={FIELD_CLASS} placeholder="GaziAI LinkedIn Outreach 1" />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Target Lead Count</span>
                  <input type="number" min={0} value={targetLeadCount} onChange={(event) => setTargetLeadCount(event.target.value)} className={FIELD_CLASS} placeholder="100" />
                  <p className="text-xs text-slate-400 font-medium">Total number of leads to fetch</p>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-2">
                     <span className="text-sm font-semibold text-slate-700">Daily Limit</span>
                     <input type="number" min={1} value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} className={FIELD_CLASS} />
                  </label>
                  <label className="space-y-2">
                     <span className="text-sm font-semibold text-slate-700">Action Gap (mins)</span>
                     <input type="number" min={0} value={actionGap} onChange={(event) => setActionGap(event.target.value)} className={FIELD_CLASS} />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition-all ${stopOnReply ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm ring-4 ring-indigo-500/10' : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300'}`}>
                  <input type="checkbox" checked={stopOnReply} onChange={(event) => setStopOnReply(event.target.checked)} className="sr-only" />
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${stopOnReply ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-extrabold">Stop On Reply</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Campaign Owner' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Campaign Owner</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Define the company and creator shown on this campaign.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Company Name</span>
                  <input value={campaignOwner.company_name} onChange={(event) => setCampaignOwner((current) => ({ ...current, company_name: event.target.value }))} className={FIELD_CLASS} placeholder="Gazi AI" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Creator</span>
                  <input value={campaignOwner.created_from_company} onChange={(event) => setCampaignOwner((current) => ({ ...current, created_from_company: event.target.value }))} className={FIELD_CLASS} placeholder="Campaign creator" />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Schedule' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Sending Schedule</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Set the delivery window and active sending days.</p>
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
                      className={SELECT_TRIGGER_CLASS}
                    >
                      <span className="truncate cursor-pointer">{timezone}</span>
                      <ChevronDown className="h-4 w-4 cursor-pointer text-slate-400" aria-hidden="true" />
                    </button>
                    {timezoneOpen && (
                      <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-100 px-3 py-2">
                          <input
                            autoFocus
                            value={timezoneSearch}
                            onChange={(event) => setTimezoneSearch(event.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            placeholder="Search timezone..."
                          />
                        </div>
                        <div className="max-h-44 overflow-auto py-0.5">
                          {filteredTimezones.length ? (
                            filteredTimezones.map((tz) => (
                              <button
                                key={tz}
                                type="button"
                                onClick={() => {
                                  setTimezone(tz)
                                  setTimezoneOpen(false)
                                  setTimezoneSearch('')
                                }}
                                className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition hover:bg-slate-50 ${timezone === tz ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-650 font-medium'}`}
                              >
                                {tz}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs text-slate-400">No timezones found.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                <div ref={timePickerRef} className="md:col-span-2 grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">From</span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTimePickerOpen((c) => (c === 'from' ? null : 'from'))}
                        className={SELECT_TRIGGER_CLASS}
                      >
                        <span>{formatTimeLabel(fromTime)}</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${timePickerOpen === 'from' ? 'rotate-180' : ''}`} />
                      </button>

                      {timePickerOpen === 'from' && (
                        <div className="absolute left-0 top-full z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                          <div ref={fromTimeListRef} className="max-h-44 overflow-auto py-1 scrollbar-thin">
                            {TIME_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                data-active={fromTime === option.value}
                                onClick={() => {
                                  setFromTime(option.value)
                                  setTimePickerOpen(null)
                                }}
                                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                                  fromTime === option.value
                                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {fromTime === option.value && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">To</span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTimePickerOpen((c) => (c === 'to' ? null : 'to'))}
                        className={SELECT_TRIGGER_CLASS}
                      >
                        <span>{formatTimeLabel(toTime)}</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${timePickerOpen === 'to' ? 'rotate-180' : ''}`} />
                      </button>

                      {timePickerOpen === 'to' && (
                        <div className="absolute left-0 top-full z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                          <div ref={toTimeListRef} className="max-h-44 overflow-auto py-1 scrollbar-thin">
                            {TIME_OPTIONS_WITH_2359.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                data-active={toTime === option.value}
                                onClick={() => {
                                  setToTime(option.value)
                                  setTimePickerOpen(null)
                                }}
                                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                                  toTime === option.value
                                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {toTime === option.value && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">Sending Days</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                    <label key={day} className={`flex min-h-[76px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-sm capitalize transition-all ${days[day] ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-500/10 font-bold shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 shadow-sm font-semibold'}`}>
                      <input
                        type="checkbox"
                        checked={days[day]}
                        onChange={() => toggleDay(day)}
                        className="sr-only"
                      />
                      <span className={`h-2 w-2 rounded-full ${days[day] ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span className="font-extrabold">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Sender Profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Sender Profile</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Personalize the LinkedIn sender and reporting details.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Sender Name</span>
                  <input value={senderInfo.name} onChange={(event) => setSenderField('name', event.target.value)} className={FIELD_CLASS} placeholder="Sender name" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-indigo-600">Report Email</span>
                  <input
                    type="email"
                    value={senderInfo.report_email}
                    onChange={(event) => setSenderField('report_email', event.target.value)}
                    className="h-12 w-full rounded-2xl border border-indigo-200 bg-indigo-50/50 px-4 text-sm font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-indigo-300 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="reports@company.com"
                  />
                  <p className="text-[10px] text-indigo-600 font-semibold">Weekly reports will be sent here.</p>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Company</span>
                  <input value={senderInfo.company} onChange={(event) => setSenderField('company', event.target.value)} className={FIELD_CLASS} placeholder="Company name" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Location</span>
                  <input value={senderInfo.location} onChange={(event) => setSenderField('location', event.target.value)} className={FIELD_CLASS} placeholder="City, Country" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Address</span>
                  <input value={senderInfo.address} onChange={(event) => setSenderField('address', event.target.value)} className={FIELD_CLASS} placeholder="Street address" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Booking Calendar Link</span>
                  <input value={senderInfo.booking_calendar_link} onChange={(event) => setSenderField('booking_calendar_link', event.target.value)} className={FIELD_CLASS} placeholder="https://cal.com/..." />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Client Email</span>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(event) => {
                      setClientEmail(event.target.value)
                      setUseExistingToken(false)
                    }}
                    className={FIELD_CLASS}
                    placeholder="client@email.com"
                  />
                </label>
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Calendly Token</span>
                  {loadingTokens ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Looking up existing tokens…
                    </div>
                  ) : existingTokens.length > 0 && !useExistingToken ? (
                    <div className="space-y-2">
                      <select
                        value={calendlyToken}
                        onChange={(event) => {
                          setCalendlyToken(event.target.value)
                          if (event.target.value === '__new__') {
                            setCalendlyToken('')
                            setUseExistingToken(true)
                          }
                        }}
                        className={FIELD_CLASS}
                      >
                        <option value="">Select an existing token</option>
                        {existingTokens.map((item, idx) => (
                          <option key={idx} value={item.token}>
                            {item.token.slice(0, 20)}… — from "{item.campaign_name}"
                          </option>
                        ))}
                        <option value="__new__">＋ Enter a new token</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        value={calendlyToken}
                        onChange={(event) => setCalendlyToken(event.target.value)}
                        className={FIELD_CLASS}
                        placeholder="Enter Calendly Token"
                      />
                      {existingTokens.length > 0 && useExistingToken && (
                        <button
                          type="button"
                          onClick={() => { setUseExistingToken(false); setCalendlyToken('') }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          ← Back to existing tokens
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Company Details</span>
                  <textarea value={senderInfo.company_details} onChange={(event) => setSenderField('company_details', event.target.value)} className={TEXTAREA_CLASS} placeholder="Describe your company, offer, and relevant context." />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Sequences' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Sequence Steps</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">1 connection request + 4 follow-up messages. Adjust the day delays for follow-ups 2–4.</p>
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
                    <div key={stepNumber} className="group relative rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-5 shadow-sm">
                      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-sky-500" />
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-xs font-extrabold text-indigo-700 ring-1 ring-indigo-100">{stepNumber}</span>
                            {stepTitle}
                          </h3>
                          {isRequiredZeroDelayStep && (
                            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold uppercase text-indigo-600">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-[220px_1fr_220px]">
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Step Type</span>
                          <span className="flex h-12 w-full items-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-bold text-indigo-700 shadow-sm">
                            {stepLabel}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Message</span>
                          <div className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-500 shadow-inner">
                            {isConnectionRequest
                              ? 'AI will automatically generate a personalized connection request for each lead.'
                              : 'AI will automatically generate a personalized follow-up message for each lead.'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Delay</span>
                          {isConnectionRequest ? (
                            <span className="flex h-12 w-full items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 shadow-inner">
                              0 Days
                            </span>
                          ) : index === 1 ? (
                            <span className="flex h-12 w-full items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 shadow-inner">
                              3 Hours
                            </span>
                          ) : (
                            <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
                              <input
                                type="number"
                                min={step.delay_unit === 'hours' ? 3 : 1}
                                value={step.delay !== undefined ? step.delay : step.day_delay}
                                onChange={(event) => updateDelayValue(index, event.target.value)}
                                className="h-full w-16 border-none bg-transparent px-4 text-sm font-semibold text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <div className="ml-auto flex h-8 items-center gap-0.5 rounded-xl bg-slate-100 p-0.5 mr-2">
                                <button
                                  type="button"
                                  onClick={() => updateDelayUnit(index, 'days')}
                                  className={`flex h-7 items-center rounded-lg px-3 text-xs font-bold transition-all ${
                                    (step.delay_unit || 'days') === 'days'
                                      ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/60'
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  Days
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateDelayUnit(index, 'hours')}
                                  className={`flex h-7 items-center rounded-lg px-3 text-xs font-bold transition-all ${
                                    step.delay_unit === 'hours'
                                      ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200/60'
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  Hours
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {sequenceError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 shadow-sm">{sequenceError}</div>}

              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-inner">
                <h3 className="text-sm font-extrabold text-slate-900 mb-3">Launch Preview</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 font-bold bg-slate-50/70">
                      <tr>
                        <th className="px-4 py-3">Step</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Delay</th>
                        <th className="px-4 py-3">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {steps.map((step, index) => (
                        <tr key={`preview-${index}`} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-2.5 font-semibold text-slate-700">{index === 0 ? 'Connection Request' : `Follow-up ${index}`}</td>
                          <td className="px-4 py-2.5 text-slate-600 font-medium">{index === 0 ? 'Connection Request' : 'Follow-up Message'}</td>
                          <td className="px-4 py-2.5 text-indigo-650 font-bold font-mono">
                            {index === 0 ? '0 days' : index === 1 ? '3 hours' : `${step.delay !== undefined ? step.delay : step.day_delay} ${step.delay_unit || 'days'}`}
                          </td>
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
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Leads & Account</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Configure how LinkedIn prospects are added to this campaign.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm">
                    <Users className="h-3.5 w-3.5 text-indigo-500" />
                    {selectedHeyReachAccount ? 1 : 0} sender
                  </span>
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 shadow-sm">
                    <Users className="h-3.5 w-3.5" />
                    {leadMode === 'import' ? `${leadRows.length} imported` : 'External source'}
                  </span>
                </div>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                        <Users className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">HeyReach Account</h3>
                        <p className="mt-0.5 text-xs font-semibold text-slate-400">Add the LinkedIn sender account.</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-2xl space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1">
                        <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddHeyReachAccount}
                        disabled={addingHeyReachAccount || !heyReachAccountIdInput.trim()}
                        className="inline-flex h-11 min-w-[92px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingHeyReachAccount ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add
                          </>
                        )}
                      </button>
                    </div>

                    {selectedHeyReachAccount ? (
                      <div className="flex flex-wrap gap-2">
                        <span
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-100 bg-white py-1.5 pl-3 pr-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-indigo-50 animate-in fade-in zoom-in duration-200"
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
                          <span className="max-w-[320px] truncate" title={`${selectedHeyReachAccount.name}${selectedHeyReachAccount.email ? ` - ${selectedHeyReachAccount.email}` : ''}`}>
                            {selectedHeyReachAccount.name}
                            {selectedHeyReachAccount.email ? ` - ${selectedHeyReachAccount.email}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedHeyReachAccount(null)}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Remove HeyReach account"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400">No HeyReach account added yet.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Lead Source</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Import a file now or let GaziAI build the list.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {LEAD_MODE_OPTIONS.map((option) => {
                    const selected = leadMode === option.value
                    const SourceIcon = option.value === 'external' ? Search : UploadCloud
                    return (
                      <label
                        key={option.value}
                        className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-5 transition-all ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-4 ring-indigo-500/10'
                            : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="lead_mode"
                          className="sr-only"
                          checked={selected}
                          onChange={() => setLeadMode(option.value)}
                        />
                        <div className="flex items-start gap-4">
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition ${
                            selected
                              ? 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-lg shadow-indigo-500/20'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-white'
                          }`}>
                            <SourceIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-extrabold text-slate-900">{option.label}</div>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                                selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent'
                              }`}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </span>
                            </div>
                            <div className="mt-1 text-sm font-medium leading-6 text-slate-500">{option.description}</div>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>

                {leadMode === 'external' && (
                  <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-in fade-in duration-300 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Target Country</span>
                      <div ref={countryRef} className="relative">
                        <input
                          value={externalLead.market_name}
                          onChange={(event) => {
                            setExternalLead((current) => ({ ...current, market_name: event.target.value }))
                            setCountryOpen(true)
                            setCountryHighlight(0)
                          }}
                          onFocus={() => {
                            setCountryOpen(true)
                            setCountryHighlight(0)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              setCountryOpen(false)
                              return
                            }
                            if (!countryOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                              setCountryOpen(true)
                              return
                            }
                            if (event.key === 'ArrowDown') {
                              event.preventDefault()
                              setCountryHighlight((current) => Math.min(current + 1, Math.max(filteredCountries.length - 1, 0)))
                            }
                            if (event.key === 'ArrowUp') {
                              event.preventDefault()
                              setCountryHighlight((current) => Math.max(current - 1, 0))
                            }
                            if (event.key === 'Enter') {
                              const selected = filteredCountries[countryHighlight] || filteredCountries[0]
                              if (selected) {
                                event.preventDefault()
                                setExternalLead((current) => ({ ...current, market_name: selected }))
                                setCountryOpen(false)
                              }
                            }
                          }}
                          className={FIELD_CLASS}
                          placeholder="e.g. United States"
                        />
                        {countryOpen && filteredCountries.length > 0 && (
                          <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl">
                            {filteredCountries.slice(0, 100).map((country, index) => (
                              <li
                                key={country}
                                onMouseEnter={() => setCountryHighlight(index)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setExternalLead((current) => ({ ...current, market_name: country }))
                                  setCountryOpen(false)
                                }}
                                className={`cursor-pointer px-3 py-2 text-sm font-medium ${index === countryHighlight ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-650 hover:bg-slate-50'}`}
                              >
                                {country}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Product / Offering Name</span>
                      <input
                        value={externalLead.product_name}
                        onChange={(event) => setExternalLead((current) => ({ ...current, product_name: event.target.value }))}
                        className={FIELD_CLASS}
                        placeholder="e.g. AI CRM Automation"
                      />
                    </label>
                  </div>
                )}

                {leadMode === 'import' && (
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-in fade-in duration-300">
                    <label className="group flex min-h-[172px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-7 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40">
                      <input
                        type="file"
                        accept=".csv,.txt,.xlsx,.xls"
                        onChange={handleLeadFileChange}
                        className="sr-only"
                      />
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200 transition group-hover:scale-105 group-hover:ring-indigo-200">
                        <UploadCloud className="h-6 w-6" />
                      </span>
                      <span className="mt-4 text-sm font-extrabold text-slate-900">
                        {leadFileName || 'Choose CSV or spreadsheet'}
                      </span>
                      <span className="mt-1 max-w-lg text-xs font-semibold leading-5 text-slate-500">
                        Supports CSV, TXT, XLS, and XLSX files with the required lead columns.
                      </span>
                    </label>

                    {leadFileError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-bold text-red-700">
                          <X className="h-4 w-4 text-red-500 shrink-0" />
                          <span>{leadFileError}</span>
                        </div>
                      </div>
                    )}

                    {leadFileName && !leadFileError && (
                      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-bold shadow-sm">
                        <span className="font-semibold">{leadFileName}</span>
                        <span className="text-emerald-600/80">- {leadRows.length} rows loaded</span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 shadow-sm animate-bounce">
            <span className="font-extrabold text-red-800">Error:</span> {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
          <div className="flex items-center gap-2">
            {activeTab !== 'Basics' && (
              <button
                type="button"
                onClick={() => setActiveTab(TABS[Math.max(0, TABS.indexOf(activeTab) - 1)])}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-5 font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Previous
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeTab !== 'Leads' ? (
              <button
                type="button"
                onClick={() => setActiveTab(TABS[Math.min(TABS.length - 1, TABS.indexOf(activeTab) + 1)])}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-6 font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Next Step
              </button>
            ) : hideSubmit ? null : (
              <button
                type="submit"
                disabled={submitting || Boolean(sequenceError)}
                className="h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 px-8 font-extrabold text-white shadow-lg shadow-indigo-600/20 transition hover:shadow-indigo-600/30 disabled:opacity-60"
              >
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
