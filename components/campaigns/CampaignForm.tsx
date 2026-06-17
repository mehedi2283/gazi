"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { ChevronDown, Lock, Plus, Trash2, Paperclip, Loader2, X, Settings, Calendar, UserCircle, ListOrdered, Users, Building2, Mail, UploadCloud, FileSpreadsheet, CheckCircle2, Search } from 'lucide-react'
import { DEFAULT_TIMEZONE, INSTANTLY_TIMEZONES } from '../../lib/timezones'
import { supabase } from '../../lib/supabase/client'

type LeadCreationMode = 'apollo' | 'import'

type LeadCreationConfig =
  | {
      mode: 'apollo'
      lead: {
        market_name: string
        product_name: string
      }
    }
  | {
      mode: 'import'
      leads: Record<string, any>[]
    }

type EmailAccount = {
  id: string
  email_address: string
  account_name: string
  provider: string
}

type SequenceStep = {
  delay_days: number
}

type CampaignInitialData = {
  name?: string
  company_name?: string | null
  created_from_company?: string | null
  daily_limit?: number | null
  email_gap?: number | null
  stop_on_reply?: boolean | null
  open_tracking?: boolean | null
  link_tracking?: boolean | null
  timezone?: string | null
  from_time?: string | null
  to_time?: string | null
  days?: {
    monday?: boolean
    tuesday?: boolean
    wednesday?: boolean
    thursday?: boolean
    friday?: boolean
    saturday?: boolean
    sunday?: boolean
  }
  sending_days?: {
    monday?: boolean
    tuesday?: boolean
    wednesday?: boolean
    thursday?: boolean
    friday?: boolean
    saturday?: boolean
    sunday?: boolean
  }
  sequences?: Array<{
    delay_days?: number | null
  }>
  target_lead_count?: number | null
  attachment_url?: string | null
  signature?: string | null
  report_email?: string | null
  booking_calendar_link?: string | null
  signature_url?: string | null
  calendly_token?: string | null
  client_email?: string | null
  sender_name?: string | null
  sender_company?: string | null
  sender_company_details?: string | null
  long_message?: string | null
  location?: string | null
  sender_address?: string | null
}

type CampaignFormProps = {
  title: string
  subtitle: string
  submitLabel: string
  mode: 'create' | 'edit'
  channel?: 'email' | 'both'
  hideSubmit?: boolean
  initialData?: CampaignInitialData | null
  onSubmit: (payload: any) => Promise<void>
}

export type CampaignFormHandle = {
  validate: () => boolean
  submit: () => Promise<void>
}

const LEAD_MODE_OPTIONS: Array<{ value: LeadCreationMode; label: string; description: string }> = [
  { value: 'apollo', label: 'External', description: 'Send country and product data to GaziAI Buyer Discovery' },
  { value: 'import', label: 'Import', description: 'Upload a CSV or spreadsheet of leads' }
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

const CONTENT_LOCK_TOOLTIP = 'Email content is AI-personalized per lead and cannot be edited manually'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const REQUIRED_COLUMNS = [
  'email', 'first_name', 'last_name', 'title', 'company_name',
  'company_domain', 'website', 'linkedin_url', 'city', 'state',
  'country', 'industry', 'employees', 'annual_revenue', 'phone',
  'company_linkedin_url', 'facebook_url', 'twitter_url',
  'company_address', 'company_city', 'company_state', 'company_country',
  'company_phone', 'technologies', 'total_funding', 'latest_funding',
  'latest_funding_amount', 'last_raised_at'
]

function normalizeColumnName(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function validateColumns(rows: Record<string, any>[]): string[] {
  if (!rows.length) return []
  const headers = Object.keys(rows[0]).map(normalizeColumnName)
  return REQUIRED_COLUMNS.filter((col) => {
    // Check exact match or substring match (e.g. "First Name" -> "first_name")
    return !headers.some((h) => h === col || h.includes(col) || col.includes(h))
  })
}

function getSubjectVariable(stepNumber: number) {
  return `{{custom_subject_${stepNumber}}}`
}

function getBodyVariable(stepNumber: number) {
  return `{{personalization_${stepNumber}}}`
}

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

// Add 11:59 PM as a special option at the end
const TIME_OPTIONS_WITH_2359 = [...TIME_OPTIONS, { value: '23:59', label: '11:59 PM' }]

function formatTimeLabel(value: string) {
  const match = /^([0-2]\d):([0-5]\d)$/.exec(value)
  if (!match) return value

  const hours24 = Number(match[1])
  const minutes = match[2]
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = ((hours24 + 11) % 12) + 1

  return `${hours12}:${minutes} ${period}`
}

function getSequenceError(steps: SequenceStep[]) {
  if (steps[0]?.delay_days !== 0) {
    return 'Step 1 day must be 0.'
  }

  for (let index = 1; index < steps.length; index += 1) {
    const current = steps[index]?.delay_days
    const previous = steps[index - 1]?.delay_days

    if (!Number.isFinite(current) || current < 0) {
      return `Step ${index + 1} day must be 0 or greater.`
    }

    if (current <= previous) {
      return `Step ${index + 1} day must be greater than Step ${index}.`
    }
  }

  return ''
}

const FIELD_CLASS = 'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-400'
const TEXTAREA_CLASS = 'min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
const SELECT_TRIGGER_CLASS = 'flex h-12 w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
const READONLY_FIELD_CLASS = 'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 shadow-inner'

function LockedLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
      {children}
      <span className="group relative inline-flex cursor-help" tabIndex={0}>
        <Lock className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition-colors" aria-hidden="true" />
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-30 mb-2.5 hidden w-[min(16rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium leading-relaxed text-slate-600 shadow-xl transition-all animate-in fade-in slide-in-from-bottom-1 duration-200 group-hover:block group-focus:block"
        >
          {CONTENT_LOCK_TOOLTIP}
          <span className="absolute left-2 top-full h-1.5 w-1.5 -translate-y-[3px] rotate-45 border-r border-b border-slate-200 bg-white" />
        </span>
      </span>
    </span>
  )
}

const TABS = ['Basics', 'Campaign Owner', 'Schedule', 'Sender Profile', 'Sequences', 'Leads'] as const
type Tab = typeof TABS[number] | 'LinkedIn'

type CombinedLinkedInStep = {
  day_delay: number
}

const CampaignForm = React.forwardRef<CampaignFormHandle, CampaignFormProps>(function CampaignForm({ title, subtitle, submitLabel, mode, channel = 'email', hideSubmit = false, initialData, onSubmit }, ref) {
  const isCombinedChannel = channel === 'both'
  const [activeTab, setActiveTab] = useState<Tab>('Basics')
  const visibleTabs = useMemo(() => (
    isCombinedChannel ? [...TABS, 'LinkedIn'] as Tab[] : [...TABS] as Tab[]
  ), [isCombinedChannel])
  const [submitting, setSubmitting] = useState(false)
  const [verifyingToken, setVerifyingToken] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState(initialData?.name || '')
  const [campaignOwner, setCampaignOwner] = useState({
    company_name: initialData?.company_name || '',
    created_from_company: initialData?.created_from_company || ''
  })
  const [timezone, setTimezone] = useState(initialData?.timezone || DEFAULT_TIMEZONE)
  const [dailyLimit, setDailyLimit] = useState(String(initialData?.daily_limit ?? 50))
  const [emailGap, setEmailGap] = useState(String(initialData?.email_gap ?? 10))
  const [fromTime, setFromTime] = useState(initialData?.from_time || '09:00')
  const [toTime, setToTime] = useState(initialData?.to_time || '17:00')
  const [stopOnReply, setStopOnReply] = useState(initialData?.stop_on_reply ?? true)
  const [openTracking, setOpenTracking] = useState(initialData?.open_tracking ?? true)
  const [linkTracking, setLinkTracking] = useState(initialData?.link_tracking ?? true)
  const [leadMode, setLeadMode] = useState<LeadCreationMode>('apollo')
  const [leadRows, setLeadRows] = useState<Record<string, any>[]>([])
  const [leadFileName, setLeadFileName] = useState('')
  const [leadFileError, setLeadFileError] = useState<string[]>([])
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const selectedEmail = selectedEmails[0] || ''
  const [emailInput, setEmailInput] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  
  const [emailMenuOpen, setEmailMenuOpen] = useState(false)
  const [deletingEmailId, setDeletingEmailId] = useState('')
  const [syncingEmails, setSyncingEmails] = useState(false)
  const [apolloLead, setApolloLead] = useState({
    market_name: '',
    product_name: ''
  })
  const [senderInfo, setSenderInfo] = useState({
    name: initialData?.sender_name || '',
    company: initialData?.sender_company || '',
    company_details: initialData?.sender_company_details || '',
    long_message: initialData?.long_message || '',
    location: initialData?.location || '',
    address: initialData?.sender_address || '',
    booking_calendar_link: initialData?.booking_calendar_link || '',
    signature: initialData?.signature || '',
    signature_url: initialData?.signature_url || '',
    linkedin_profile_url: ''
  })
  const [reportEmail, setReportEmail] = useState(initialData?.report_email || '')
  const [calendlyToken, setCalendlyToken] = useState(initialData?.calendly_token || '')
  const [clientEmail, setClientEmail] = useState(initialData?.client_email || '')
  const [existingTokens, setExistingTokens] = useState<Array<{ token: string; campaign_name: string }>>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [useExistingToken, setUseExistingToken] = useState(false)
  const [targetLeadCount, setTargetLeadCount] = useState(String(initialData?.target_lead_count ?? 100))
  const [attachmentUrl, setAttachmentUrl] = useState(initialData?.attachment_url || '')
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countryHighlight, setCountryHighlight] = useState(0)
  const [timezoneOpen, setTimezoneOpen] = useState(false)
  const [timezoneSearch, setTimezoneSearch] = useState('')
  const [timePickerOpen, setTimePickerOpen] = useState<null | 'from' | 'to'>(null)
  const countryRef = React.useRef<HTMLDivElement | null>(null)
  const emailPickerRef = React.useRef<HTMLDivElement | null>(null)
  const timezoneRef = React.useRef<HTMLDivElement | null>(null)
  const timePickerRef = React.useRef<HTMLDivElement | null>(null)
  const [days, setDays] = useState({
    monday: initialData?.sending_days?.monday ?? initialData?.days?.monday ?? true,
    tuesday: initialData?.sending_days?.tuesday ?? initialData?.days?.tuesday ?? true,
    wednesday: initialData?.sending_days?.wednesday ?? initialData?.days?.wednesday ?? true,
    thursday: initialData?.sending_days?.thursday ?? initialData?.days?.thursday ?? true,
    friday: initialData?.sending_days?.friday ?? initialData?.days?.friday ?? true,
    saturday: initialData?.sending_days?.saturday ?? initialData?.days?.saturday ?? false,
    sunday: initialData?.sending_days?.sunday ?? initialData?.days?.sunday ?? false
  })
  const [steps, setSteps] = useState<SequenceStep[]>(() => {
    const initialSteps = initialData?.sequences?.length
      ? initialData.sequences.map((sequence, index) => ({
          delay_days: index === 0 ? 0 : Number(sequence.delay_days ?? index)
        }))
      : [{ delay_days: 0 }]

    return initialSteps
  })
  const [combinedLinkedInActionGap, setCombinedLinkedInActionGap] = useState(String(initialData?.email_gap ?? 10))
  const [combinedLinkedInSteps, setCombinedLinkedInSteps] = useState<CombinedLinkedInStep[]>([{ day_delay: 0 }])

  // Fetch email accounts from Supabase
  useEffect(() => {
    async function fetchEmailAccounts() {
      try {
        const response = await fetch('/api/email-accounts')
        const json = await response.json()

        if (!response.ok || json.error) {
          console.error('Error fetching email accounts:', json.error)
          return
        }
        
        if (Array.isArray(json.data)) {
          setEmailAccounts(json.data as EmailAccount[])
        }
      } catch (err) {
        console.error('Failed to fetch email accounts:', err)
      }
    }

    fetchEmailAccounts()
  }, [])

  async function handleSyncEmailAccounts() {
    setSyncingEmails(true)
    try {
      const resp = await fetch('/api/email-accounts/sync', { method: 'POST' })
      const json = await resp.json()
      if (!resp.ok || json.error) throw new Error(json.error || 'Sync failed')
      // refresh local list
      const r2 = await fetch('/api/email-accounts')
      const j2 = await r2.json()
      if (Array.isArray(j2.data)) setEmailAccounts(j2.data)
      toast.success(`Synced ${json.data?.synced || 0} accounts`)    
    } catch (err: any) {
      console.error('Sync failed', err)
      toast.error(err?.message || 'Failed to sync accounts')
    } finally {
      setSyncingEmails(false)
    }
  }

  async function handleAddEmailAccount() {
    // Manual addition removed — syncing and selecting from saved accounts only
  }

  async function handleDeleteEmailAccount(account: EmailAccount) {
    setDeletingEmailId(account.id)
    try {
      const response = await fetch(`/api/email-accounts?id=${encodeURIComponent(account.id)}`, {
        method: 'DELETE'
      })
      const json = await response.json()

      if (!response.ok || json.error) {
        throw new Error(json.error?.message || json.error || 'Failed to delete email account')
      }

      setEmailAccounts((prev) => prev.filter((item) => item.id !== account.id))
      setSelectedEmails((prev) => prev.filter((item) => item.toLowerCase() !== account.email_address.toLowerCase()))
      toast.success('Email account deleted')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete email account')
    } finally {
      setDeletingEmailId('')
    }
  }

  async function handleAddEmail() {
    const email = emailInput.trim().toLowerCase()
    if (!email) return

    // Simple regex validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (selectedEmails.map(e => e.toLowerCase()).includes(email)) {
      toast.error('This email is already added')
      return
    }

    setAddingEmail(true)
    try {
      // Ask Instantly for this mailbox directly instead of syncing every account.
      const resp = await fetch(`/api/email-accounts/sync?search=${encodeURIComponent(email)}`, { method: 'POST' })
      const json = await resp.json()
      if (!resp.ok || json.error) throw new Error(json.error || 'Sync failed')

      const accounts: EmailAccount[] = Array.isArray(json.data?.local) ? json.data.local : []

      const match = accounts.find((acc) => acc.email_address.toLowerCase() === email)
      if (match) {
        setEmailAccounts((prev) => {
          const withoutMatch = prev.filter((acc) => acc.email_address.toLowerCase() !== email)
          return [...withoutMatch, match].sort((left, right) => left.email_address.localeCompare(right.email_address))
        })
        setSelectedEmails((prev) => [...prev, email])
        setError('')
        setEmailInput('')
        toast.success(`Verified and added: ${email}`)
      } else {
        toast.error(`There is no sending email with this address in your account.`)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to verify email account')
    } finally {
      setAddingEmail(false)
    }
  }

  useEffect(() => {
    setName(initialData?.name || '')
    setCampaignOwner({
      company_name: initialData?.company_name || '',
      created_from_company: initialData?.created_from_company || ''
    })
    setTimezone(initialData?.timezone || DEFAULT_TIMEZONE)
    setDailyLimit(String(initialData?.daily_limit ?? 50))
    setEmailGap(String(initialData?.email_gap ?? 10))
    setFromTime(initialData?.from_time || '09:00')
    setToTime(initialData?.to_time || '17:00')
    setStopOnReply(initialData?.stop_on_reply ?? true)
    setOpenTracking(initialData?.open_tracking ?? true)
    setLinkTracking(initialData?.link_tracking ?? true)
    setDays({
      monday: initialData?.sending_days?.monday ?? initialData?.days?.monday ?? true,
      tuesday: initialData?.sending_days?.tuesday ?? initialData?.days?.tuesday ?? true,
      wednesday: initialData?.sending_days?.wednesday ?? initialData?.days?.wednesday ?? true,
      thursday: initialData?.sending_days?.thursday ?? initialData?.days?.thursday ?? true,
      friday: initialData?.sending_days?.friday ?? initialData?.days?.friday ?? true,
      saturday: initialData?.sending_days?.saturday ?? initialData?.days?.saturday ?? false,
      sunday: initialData?.sending_days?.sunday ?? initialData?.days?.sunday ?? false
    })
    setSteps(
      initialData?.sequences?.length
        ? initialData.sequences.map((sequence, index) => ({
            delay_days: index === 0 ? 0 : Number(sequence.delay_days ?? index)
          }))
        : [{ delay_days: 0 }]
    )
    setTargetLeadCount(String(initialData?.target_lead_count ?? 100))
    setCombinedLinkedInActionGap(String(initialData?.email_gap ?? 10))
    setCombinedLinkedInSteps([{ day_delay: 0 }])
    setAttachmentUrl(initialData?.attachment_url || '')
    setSenderInfo((prev) => ({
      ...prev,
      name: initialData?.sender_name || '',
      company: initialData?.sender_company || '',
      company_details: initialData?.sender_company_details || '',
      long_message: initialData?.long_message || '',
      location: initialData?.location || '',
      address: initialData?.sender_address || '',
      signature: initialData?.signature || '',
      booking_calendar_link: initialData?.booking_calendar_link || '',
      signature_url: initialData?.signature_url || '',
      linkedin_profile_url: ''
    }))
    setReportEmail(initialData?.report_email || '')
    setCalendlyToken(initialData?.calendly_token || '')
    setClientEmail(initialData?.client_email || '')
    setExistingTokens([])
    setUseExistingToken(false)
    setError('')
  }, [initialData])

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

  const sequenceError = useMemo(() => getSequenceError(steps), [steps])
  const combinedLinkedInSequenceError = useMemo(() => (
    isCombinedChannel
      ? getSequenceError(combinedLinkedInSteps.map((step) => ({ delay_days: step.day_delay })))
      : ''
  ), [combinedLinkedInSteps, isCombinedChannel])
  const selectedEmailAccount = useMemo(() => {
    return emailAccounts.find((account) => account.email_address.toLowerCase() === selectedEmail.toLowerCase()) || null
  }, [emailAccounts, selectedEmail])
  const filteredCountries = useMemo(() => {
    const query = apolloLead.market_name.trim().toLowerCase()
    if (!query) return COUNTRY_OPTIONS
    return COUNTRY_OPTIONS.filter((country) => country.toLowerCase().includes(query))
  }, [apolloLead.market_name])
  const filteredTimezones = useMemo(() => {
    const query = timezoneSearch.trim().toLowerCase()
    if (!query) return INSTANTLY_TIMEZONES
    return INSTANTLY_TIMEZONES.filter((tz) => tz.toLowerCase().includes(query))
  }, [timezoneSearch])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!countryRef.current) return
      if (!countryRef.current.contains(event.target as Node)) {
        setCountryOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [])



  useEffect(() => {
    function handleTimezoneOutsideClick(event: MouseEvent) {
      if (!timezoneRef.current) return
      if (!timezoneRef.current.contains(event.target as Node)) {
        setTimezoneOpen(false)
      }
    }

    window.addEventListener('mousedown', handleTimezoneOutsideClick)
    return () => window.removeEventListener('mousedown', handleTimezoneOutsideClick)
  }, [])

  useEffect(() => {
    function handleTimePickerOutsideClick(event: MouseEvent) {
      if (!timePickerRef.current) return
      if (!timePickerRef.current.contains(event.target as Node)) {
        setTimePickerOpen(null)
      }
    }

    window.addEventListener('mousedown', handleTimePickerOutsideClick)
    return () => window.removeEventListener('mousedown', handleTimePickerOutsideClick)
  }, [])

  function addStep() {
    setSteps((current) => {
      const previousDelay = current[current.length - 1]?.delay_days ?? 0
      return [...current, { delay_days: previousDelay + 1 }]
    })
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index).map((step, stepIndex) => ({
      delay_days: stepIndex === 0 ? 0 : step.delay_days
    })))
  }

  function updateDelay(index: number, value: string) {
    setSteps((current) => current.map((step, stepIndex) => {
      if (stepIndex !== index) return step
      if (stepIndex === 0) return { delay_days: 0 }

      const minimum = (current[stepIndex - 1]?.delay_days ?? 0) + 1
      const nextValue = Number(value)

      return {
        delay_days: Number.isFinite(nextValue) ? Math.max(minimum, nextValue) : minimum
      }
    }))
  }

  function addCombinedLinkedInStep() {
    setCombinedLinkedInSteps((current) => [
      ...current,
      { day_delay: (current[current.length - 1]?.day_delay ?? 0) + 1 }
    ])
  }

  function removeCombinedLinkedInStep(index: number) {
    setCombinedLinkedInSteps((current) => (
      current.length <= 1 ? current : current.filter((_, stepIndex) => stepIndex !== index)
    ))
  }

  function updateCombinedLinkedInDelay(index: number, value: string) {
    setCombinedLinkedInSteps((current) => current.map((step, stepIndex) => {
      if (stepIndex !== index) return step
      if (stepIndex === 0) return { day_delay: 0 }

      const minimum = (current[stepIndex - 1]?.day_delay ?? 0) + 1
      const nextValue = Number(value)

      return {
        day_delay: Number.isFinite(nextValue) ? Math.max(minimum, nextValue) : minimum
      }
    }))
  }

  const handleLeadFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLeadFileError([])
    setLeadFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result
      if (typeof content !== 'string') return

      let rows: Record<string, any>[] = []

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const parsed = Papa.parse(content, { header: true, skipEmptyLines: true })
        rows = parsed.data as Record<string, any>[]
      } else {
        const workbook = XLSX.read(content, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[]
      }

      // Validate required columns
      const missingColumns = validateColumns(rows)
      if (missingColumns.length > 0) {
        setLeadFileError(missingColumns)
        setLeadRows([])
        toast.error(`File is missing ${missingColumns.length} required column(s)`)
        return
      }

      setLeadFileError([])
      setLeadRows(rows)
      toast.success(`${rows.length} rows loaded successfully`)
    }

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.readAsText(file)
    } else {
      reader.readAsBinaryString(file)
    }
  }

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit')
      return
    }

    // Allowed types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG, and Word docs are allowed')
      return
    }

    try {
      setUploadingAttachment(true)
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error } = await supabase.storage
        .from('attachments')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName)

      setAttachmentUrl(publicUrl)
      toast.success('File uploaded successfully')
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error(err.message || 'Failed to upload file')
    } finally {
      setUploadingAttachment(false)
    }
  }

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Limit to 2MB for signatures
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Signature image exceeds 2MB limit')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or GIF for your signature')
      return
    }

    try {
      setUploadingSignature(true)
      const fileName = `sig_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error } = await supabase.storage
        .from('attachments')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName)

      setSenderInfo(prev => ({ ...prev, signature_url: publicUrl }))
      toast.success('Signature image uploaded')
    } catch (err: any) {
      console.error('Signature upload error:', err)
      toast.error(err.message || 'Failed to upload signature')
    } finally {
      setUploadingSignature(false)
    }
  }

  function validateForm() {
    setError('')

    const validationError = getSequenceError(steps)
    if (validationError) {
      setError(validationError)
      return false
    }

    if (combinedLinkedInSequenceError) {
      setError(combinedLinkedInSequenceError)
      return false
    }

    if (!name.trim()) {
      setError('Campaign name is required')
      return false
    }

    if (!campaignOwner.company_name.trim() || !campaignOwner.created_from_company.trim()) {
      setError('Campaign owner details are required')
      return false
    }

    if (selectedEmails.length === 0) {
      setError('Sending email is required')
      return false
    }

    if (leadMode === 'apollo' && (!apolloLead.market_name.trim() || !apolloLead.product_name.trim())) {
      setError('Country and product name are required for External lead creation')
      return false
    }

    if (leadMode === 'import' && !leadRows.length) {
      setError('Upload a CSV or spreadsheet before creating imported leads')
      return false
    }

    if (
      !senderInfo.name.trim() ||
      !senderInfo.company.trim() ||
      !senderInfo.location.trim() ||
      !senderInfo.address.trim() ||
      !senderInfo.booking_calendar_link.trim() ||
      !calendlyToken.trim() ||
      !clientEmail.trim() ||
      (isCombinedChannel && !senderInfo.linkedin_profile_url.trim())
    ) {
      setError(isCombinedChannel ? 'Complete sender information is required (including LinkedIn Profile URL, Calendly Token, and Client Email)' : 'Complete sender information is required (including Calendly Token and Client Email)')
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
      name: name.trim(),
      company_name: campaignOwner.company_name.trim(),
      created_from_company: campaignOwner.created_from_company.trim(),
      daily_limit: Number(dailyLimit || 50),
      email_gap: Number(emailGap || 10),
      stop_on_reply: stopOnReply,
      open_tracking: openTracking,
      link_tracking: linkTracking,
      ...(mode === 'create' ? { status: 'draft' } : {}),
      campaign_schedule: {
        schedules: [
          {
            name: 'Default Schedule',
            timezone,
            timing: {
              from: fromTime,
              to: toTime
            },
            days
          }
        ]
      },
      sequences: steps.map((step, index) => {
        const stepNumber = index + 1

        return {
          step_number: stepNumber,
          delay_days: index === 0 ? 0 : step.delay_days,
          subject_variable: getSubjectVariable(stepNumber),
          body_variable: getBodyVariable(stepNumber)
        }
      })
    }

    if (!payload.name) {
      setError('Campaign name is required')
      setSubmitting(false)
      return
    }

    if (!payload.company_name || !payload.created_from_company) {
      setError('Campaign owner details are required')
      setSubmitting(false)
      return
    }

    let sendingEmail = selectedEmail.trim().toLowerCase()
    let sendingEmailAccountName = selectedEmailAccount?.account_name || sendingEmail

    // REQUIRE sending email — skip this error when a sending email has been added
    if (selectedEmails.length === 0) {
      setError('Sending email is required')
      setSubmitting(false)
      return
    }

    if (leadMode === 'apollo' && (!apolloLead.market_name.trim() || !apolloLead.product_name.trim())) {
      setError('Country and product name are required for External lead creation')
      setSubmitting(false)
      return
    }

    if (leadMode === 'import' && !leadRows.length) {
      setError('Upload a CSV or spreadsheet before creating imported leads')
      setSubmitting(false)
      return
    }

    if (
      !senderInfo.name.trim() ||
      !senderInfo.company.trim() ||
      !senderInfo.location.trim() ||
      !senderInfo.address.trim() ||
      !senderInfo.booking_calendar_link.trim() ||
      !calendlyToken.trim() ||
      !clientEmail.trim() ||
      (isCombinedChannel && !senderInfo.linkedin_profile_url.trim())
    ) {
      setError(isCombinedChannel ? 'Complete sender information is required (including LinkedIn Profile URL, Calendly Token, and Client Email)' : 'Complete sender information is required (including Calendly Token and Client Email)')
      setSubmitting(false)
      return
    }

    const leadCreation: LeadCreationConfig =
      leadMode === 'apollo'
        ? {
            mode: 'apollo',
            lead: {
              market_name: apolloLead.market_name.trim().toLowerCase(),
              product_name: apolloLead.product_name.trim()
            }
          }
        : {
            mode: 'import',
            leads: leadRows
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

    try {
      await onSubmit({
        ...payload,
        report_email: reportEmail.trim() || null,
        calendly_token: calendlyToken.trim() || null,
        client_email: clientEmail.trim() || null,
        sender_info: {
          name: senderInfo.name.trim(),
          company: senderInfo.company.trim(),
          company_details: senderInfo.company_details.trim(),
          long_message: senderInfo.long_message.trim(),
          location: senderInfo.location.trim(),
          address: senderInfo.address.trim(),
          booking_calendar_link: senderInfo.booking_calendar_link.trim(),
          attachment_url: attachmentUrl.trim(),
          signature: senderInfo.signature.trim(),
          signature_url: senderInfo.signature_url,
          ...(isCombinedChannel ? { linkedin_profile_url: senderInfo.linkedin_profile_url.trim() } : {})
        },
        ...(isCombinedChannel ? {
          channel: 'both',
          combined_linkedin: {
            action_gap_mins: Number(combinedLinkedInActionGap || emailGap || 0),
            linkedin_profile_url: senderInfo.linkedin_profile_url.trim(),
            sequences: combinedLinkedInSteps.map((step, index) => ({
              step: index + 1,
              step_type: index === 0 ? 'connection_request' : 'follow_up_message',
              message: getBodyVariable(index + 1),
              day_delay: index === 0 ? 0 : step.day_delay
            }))
          }
        } : {}),
        lead_creation: leadCreation,
        lead_creation_mode: leadMode,
        target_lead_count: Number(targetLeadCount || 0),
        ...(selectedEmails.length > 0 ? {
          sending_email: selectedEmails[0],
          sending_email_account_name: emailAccounts.find(acc => acc.email_address.toLowerCase() === selectedEmails[0].toLowerCase())?.account_name || selectedEmails[0],
          email_list: selectedEmails
        } : {})
      })
    } catch (err: any) {
      setError(err?.message || 'Unable to save campaign')
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
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">{title}</h1>
        <p className="mt-1 text-zinc-500">{subtitle}</p>
      </div>

      <div className="flex min-h-[70px] flex-wrap items-center gap-2 rounded-3xl border border-slate-200/80 bg-white/85 p-2 shadow-glass backdrop-blur-xl">
        {visibleTabs.map((tabId) => {
          const icons: Record<Tab, typeof Settings> = {
            Basics: Settings,
            'Campaign Owner': Building2,
            Schedule: Calendar,
            'Sender Profile': UserCircle,
            Sequences: ListOrdered,
            Leads: Users,
            LinkedIn: Users
          }
          const Icon = icons[tabId]

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
            <span
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeTab === tabId
                  ? 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="relative z-10 whitespace-nowrap">{tabId}</span>
          </button>
          )
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-glass backdrop-blur-xl md:p-7"
      >
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
                  <input name="name" value={name} onChange={(event) => setName(event.target.value)} className={FIELD_CLASS} placeholder="GaziAI Buyer Discovery 1" />
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Target Lead Count</span>
                  <input name="target_lead_count" type="number" min={0} className={FIELD_CLASS} value={targetLeadCount} onChange={(event) => setTargetLeadCount(event.target.value)} placeholder="100" />
                  <p className="text-xs text-slate-400 font-medium">Total number of leads to fetch</p>
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Daily Limit</span>
                    <input name="daily_limit" type="number" min={1} className={FIELD_CLASS} value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Email Gap (mins)</span>
                    <input name="email_gap" type="number" min={0} className={FIELD_CLASS} value={emailGap} onChange={(event) => setEmailGap(event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition-all ${stopOnReply ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm ring-4 ring-indigo-500/10' : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300'}`}>
                  <input type="checkbox" name="stop_on_reply" checked={stopOnReply} onChange={(event) => setStopOnReply(event.target.checked)} className="sr-only" />
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${stopOnReply ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-extrabold">Stop On Reply</span>
                </label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition-all ${openTracking ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sm ring-4 ring-sky-500/10' : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300'}`}>
                  <input type="checkbox" name="open_tracking" checked={openTracking} onChange={(event) => setOpenTracking(event.target.checked)} className="sr-only" />
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${openTracking ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-extrabold">Open Tracking</span>
                </label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition-all ${linkTracking ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm ring-4 ring-emerald-500/10' : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300'}`}>
                  <input type="checkbox" name="link_tracking" checked={linkTracking} onChange={(event) => setLinkTracking(event.target.checked)} className="sr-only" />
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${linkTracking ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-extrabold">Link Tracking</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Campaign Owner' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Campaign Owner</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">These fields are required and identify the company behind this campaign.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Company Name</span>
                  <input
                    value={campaignOwner.company_name}
                    onChange={(event) => setCampaignOwner((current) => ({ ...current, company_name: event.target.value }))}
                    className={FIELD_CLASS}
                    placeholder="Acme Inc."
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Creator</span>
                  <input
                    value={campaignOwner.created_from_company}
                    onChange={(event) => setCampaignOwner((current) => ({ ...current, created_from_company: event.target.value }))}
                    className={FIELD_CLASS}
                    placeholder="Creator name"
                    required
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Schedule' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Sending Schedule</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Define the timezone, window, and days for sending emails.</p>
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

                    {timezoneOpen ? (
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
                        <div className="max-h-64 overflow-auto py-1">
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
                                className={`flex w-full items-center px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${timezone === tz ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-700'}`}
                              >
                                {tz}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-400">No timezones found.</div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </label>
                
                <div ref={timePickerRef} className="md:col-span-2 grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">From Time</span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTimePickerOpen((current) => (current === 'from' ? null : 'from'))}
                        className={SELECT_TRIGGER_CLASS}
                      >
                        <span>{formatTimeLabel(fromTime)}</span>
                        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </button>

                      {timePickerOpen === 'from' ? (
                        <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                          <div className="max-h-64 overflow-auto py-1">
                            {TIME_OPTIONS_WITH_2359.filter(o => o.value !== '00:00').map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setFromTime(option.value)
                                  setTimePickerOpen(null)
                                }}
                                className={`flex w-full items-center px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${fromTime === option.value ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-700'}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">To Time</span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTimePickerOpen((current) => (current === 'to' ? null : 'to'))}
                        className={SELECT_TRIGGER_CLASS}
                      >
                        <span>{formatTimeLabel(toTime)}</span>
                        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </button>

                      {timePickerOpen === 'to' ? (
                        <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                          <div className="max-h-64 overflow-auto py-1">
                            {TIME_OPTIONS_WITH_2359.filter(o => o.value !== '00:00' && o.value !== '00:30').map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setToTime(option.value)
                                  setTimePickerOpen(null)
                                }}
                                className={`flex w-full items-center px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${toTime === option.value ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-700'}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
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
                        name={day}
                        checked={days[day]}
                        onChange={(event) => setDays((current) => ({ ...current, [day]: event.target.checked }))}
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
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Sender Information</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Details sent with the campaign webhook for AI personalization and reporting.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Sender Name</span>
                  <input
                    value={senderInfo.name}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, name: event.target.value }))}
                    className={FIELD_CLASS}
                    placeholder="John Doe"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-indigo-600">Report Email</span>
                  <input
                    type="email"
                    value={reportEmail}
                    onChange={(event) => setReportEmail(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-indigo-200 bg-indigo-50/50 px-4 text-sm font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-indigo-300 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="reports@client.com"
                    required
                  />
                  <p className="text-[10px] text-indigo-600 font-semibold">Weekly reports will be sent here.</p>
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Company</span>
                  <input
                    value={senderInfo.company}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, company: event.target.value }))}
                    className={FIELD_CLASS}
                    placeholder="Company name"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Location</span>
                  <input
                    value={senderInfo.location}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, location: event.target.value }))}
                    className={FIELD_CLASS}
                    placeholder="City, Country"
                    required
                  />
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Address</span>
                  <input
                    value={senderInfo.address}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, address: event.target.value }))}
                    className={FIELD_CLASS}
                    placeholder="Street address"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Booking Calendar Link</span>
                  <input
                    value={senderInfo.booking_calendar_link}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, booking_calendar_link: event.target.value }))}
                    className={FIELD_CLASS}
                    placeholder="https://cal.com/..."
                    required
                  />
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
                    required
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
                        required
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
                        required
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
                  <textarea
                    value={senderInfo.company_details}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, company_details: event.target.value }))}
                    className={TEXTAREA_CLASS}
                    placeholder="Share the company summary, positioning, or offer context"
                  />
                </label>
 
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Long Message</span>
                  <textarea
                    value={senderInfo.long_message}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, long_message: event.target.value }))}
                    className={TEXTAREA_CLASS}
                    placeholder="Paste the long-form sender note or outreach message"
                  />
                </label>
 
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Text Signature</span>
                  <textarea
                    value={senderInfo.signature}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, signature: event.target.value }))}
                    className={TEXTAREA_CLASS}
                    placeholder="Best regards, ... "
                  />
                </label>
 
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">Attachment (Optional)</span>
                  <div className="flex items-center gap-3">
                    {attachmentUrl ? (
                      <div className="flex flex-1 items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Paperclip className="h-4 w-4 shrink-0 text-indigo-500" />
                          <span className="truncate text-sm text-indigo-700 font-semibold">{attachmentUrl.split('/').pop()}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachmentUrl('')}
                          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 min-h-[132px] rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 transition hover:border-indigo-400 hover:bg-indigo-50/40 shadow-sm">
                        {uploadingAttachment ? (
                          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                        ) : (
                          <Paperclip className="h-5 w-5 text-slate-400" />
                        )}
                        <span className="text-sm text-slate-500 font-semibold text-center">
                          {uploadingAttachment ? 'Uploading...' : 'Click to upload attachment (Max 5MB)'}
                        </span>
                        <input
                          type="file"
                          onChange={handleAttachmentUpload}
                          disabled={uploadingAttachment}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
 
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">Signature Image (Optional)</span>
                  <div className="flex items-center gap-3">
                    {senderInfo.signature_url ? (
                      <div className="flex flex-1 items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img src={senderInfo.signature_url} alt="Signature" className="h-10 w-auto rounded border border-slate-200 bg-white" />
                          <span className="truncate text-xs text-indigo-700 font-semibold">Signature uploaded</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSenderInfo(prev => ({ ...prev, signature_url: '' }))}
                          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 min-h-[132px] rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 transition hover:border-indigo-400 hover:bg-indigo-50/40 shadow-sm">
                        {uploadingSignature ? (
                          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                        ) : (
                          <Paperclip className="h-5 w-5 text-slate-400" />
                        )}
                        <span className="text-sm text-slate-500 font-semibold">
                          {uploadingSignature ? 'Uploading Signature...' : 'Upload Image Signature'}
                        </span>
                        <input
                          type="file"
                          onChange={handleSignatureUpload}
                          disabled={uploadingSignature}
                          className="hidden"
                          accept="image/*"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Sequences' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Sequence Setup</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Configure delays for your automated email steps.</p>
                </div>
                <button
                  type="button"
                  onClick={addStep}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Step
                </button>
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => {
                  const stepNumber = index + 1
                  const minimumDelay = index === 0 ? 0 : (steps[index - 1]?.delay_days ?? 0) + 1

                  return (
                    <div key={stepNumber} className="group relative rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-5 shadow-sm">
                      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-sky-500" />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-xs font-extrabold text-indigo-700 ring-1 ring-indigo-100">{stepNumber}</span>
                          Step {stepNumber}
                        </h3>
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Remove
                          </button>
                        ) : null}
                      </div>

                      <div className="grid gap-5 lg:grid-cols-[1fr_1fr_180px]">
                        <label className="space-y-2">
                          <LockedLabel>Subject</LockedLabel>
                          <input
                            value={getSubjectVariable(stepNumber)}
                            disabled
                            readOnly
                            className={READONLY_FIELD_CLASS}
                          />
                        </label>

                        <label className="space-y-2">
                          <LockedLabel>Body</LockedLabel>
                          <input
                            value={getBodyVariable(stepNumber)}
                            disabled
                            readOnly
                            className={READONLY_FIELD_CLASS}
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Day Delay</span>
                          <input
                            type="number"
                            min={minimumDelay}
                            value={index === 0 ? 0 : step.delay_days}
                            disabled={index === 0}
                            onChange={(event) => updateDelay(index, event.target.value)}
                            className={FIELD_CLASS}
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>

              {sequenceError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 shadow-sm">
                  {sequenceError}
                </div>
              ) : null}
              
              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-inner">
                <h3 className="mb-3 text-sm font-extrabold text-slate-900">Launch Preview</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 font-bold bg-slate-50/70">
                      <tr>
                        <th className="px-4 py-3">Step</th>
                        <th className="px-4 py-3">Day</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Body</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {steps.map((step, index) => {
                        const stepNumber = index + 1
                        return (
                          <tr key={`preview-${stepNumber}`} className="hover:bg-slate-50/50 transition">
                            <td className="px-4 py-2.5 font-semibold text-slate-700">Step {stepNumber}</td>
                            <td className="px-4 py-2.5 text-indigo-600 font-bold font-mono">{index === 0 ? 0 : step.delay_days}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{getSubjectVariable(stepNumber)}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{getBodyVariable(stepNumber)}</td>
                          </tr>
                        )
                      })}
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
                  <p className="mt-1 text-sm font-medium text-slate-500">Choose the sender and how leads enter this campaign.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm">
                    <Mail className="h-3.5 w-3.5 text-sky-500" />
                    {selectedEmails.length || 0} sender{selectedEmails.length === 1 ? '' : 's'}
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
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                        <Mail className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">Sending Email Account</h3>
                        <p className="mt-0.5 text-xs font-semibold text-slate-400">Add one or more connected senders.</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-2xl space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddEmail()
                            }
                          }}
                          placeholder="sender@company.com"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEmail}
                        disabled={addingEmail || !emailInput.trim()}
                        className="inline-flex h-11 min-w-[92px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingEmail ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add
                          </>
                        )}
                      </button>
                    </div>

                    {selectedEmails.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedEmails.map((email) => {
                          const account = emailAccounts.find(acc => acc.email_address.toLowerCase() === email.toLowerCase())
                          const displayName = account ? (account.account_name || account.email_address) : email
                          return (
                            <span
                              key={email}
                              className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-100 bg-white py-1.5 pl-3 pr-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-sky-50 animate-in fade-in zoom-in duration-200"
                            >
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
                              <span className="max-w-[280px] truncate" title={email}>
                                {displayName}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedEmails(prev => prev.filter(e => e.toLowerCase() !== email.toLowerCase()))}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label={`Remove ${email}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400">No sender selected yet.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Lead Source</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Import a file now or let Buyer Discovery build the list.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {LEAD_MODE_OPTIONS.map((option) => {
                    const selected = leadMode === option.value
                    const SourceIcon = option.value === 'apollo' ? Search : UploadCloud
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

                {leadMode === 'apollo' && (
                  <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-in fade-in duration-300 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Target Country</span>
                      <div ref={countryRef} className="relative">
                        <input
                          value={apolloLead.market_name}
                          onChange={(event) => {
                            setApolloLead((current) => ({ ...current, market_name: event.target.value }))
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
                                setApolloLead((current) => ({ ...current, market_name: selected }))
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
                                  setApolloLead((current) => ({ ...current, market_name: country }))
                                  setCountryOpen(false)
                                }}
                                className={`cursor-pointer px-3 py-2 text-sm font-medium ${index === countryHighlight ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
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
                        value={apolloLead.product_name}
                        onChange={(event) => setApolloLead((current) => ({ ...current, product_name: event.target.value }))}
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

                    {leadFileError.length > 0 && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-bold text-red-700 mb-2">
                          <X className="h-4 w-4 text-red-500 shrink-0" />
                          File validation failed - {leadFileError.length} column(s) missing
                        </div>
                        <p className="text-xs text-slate-500 font-medium mb-3">Click a <span className="text-red-600 font-bold">red</span> column name to copy it to your clipboard.</p>
                        <div className="flex flex-wrap gap-1.5">
                          {REQUIRED_COLUMNS.map((col) => {
                            const isMissing = leadFileError.includes(col)
                            return (
                              <button
                                key={col}
                                type="button"
                                disabled={!isMissing}
                                onClick={() => {
                                  if (isMissing) {
                                    navigator.clipboard.writeText(col)
                                    toast.success(`Copied "${col}" to clipboard`)
                                  }
                                }}
                                className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold transition ${
                                  isMissing
                                    ? 'bg-red-100 border-red-300 text-red-700 cursor-pointer hover:bg-red-200 active:scale-95'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                                }`}
                                title={isMissing ? `Click to copy "${col}"` : 'Found in file'}
                              >
                                {col}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {leadFileName && leadFileError.length === 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-100">
                            <FileSpreadsheet className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-extrabold">{leadFileName}</span>
                            <span className="block text-xs font-semibold text-emerald-600/80">Ready for launch</span>
                          </span>
                        </div>
                        <span className="inline-flex h-8 items-center rounded-full bg-white px-3 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100">
                          {leadRows.length} rows loaded
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {isCombinedChannel && activeTab === 'LinkedIn' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">LinkedIn Outreach</h2>
                  <p className="text-sm text-slate-400 font-medium">Configure the LinkedIn-specific data for this combined campaign.</p>
                </div>
                <button
                  type="button"
                  onClick={addCombinedLinkedInStep}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Follow-up
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Sender LinkedIn Profile</span>
                  <input
                    value={senderInfo.linkedin_profile_url}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, linkedin_profile_url: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                    placeholder="https://linkedin.com/in/yourprofile"
                    required
                  />
                  <p className="text-xs text-slate-400 font-medium">The LinkedIn account that will be used for outreach.</p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">LinkedIn Action Gap (mins)</span>
                  <input
                    type="number"
                    min={0}
                    value={combinedLinkedInActionGap}
                    onChange={(event) => setCombinedLinkedInActionGap(event.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                  />
                </label>
              </div>

              <div className="space-y-4">
                {combinedLinkedInSteps.map((step, index) => {
                  const isConnectionRequest = index === 0
                  const stepLabel = isConnectionRequest ? 'Connection Request' : 'Follow-up Message'

                  return (
                    <div key={`combined-linkedin-step-${index}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">LinkedIn Step {index + 1}</h3>
                        {!isConnectionRequest && (
                          <button
                            type="button"
                            onClick={() => removeCombinedLinkedInStep(index)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
                            min={isConnectionRequest ? 0 : (combinedLinkedInSteps[index - 1]?.day_delay ?? 0) + 1}
                            value={isConnectionRequest ? 0 : step.day_delay}
                            disabled={isConnectionRequest}
                            onChange={(event) => updateCombinedLinkedInDelay(index, event.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>

              {combinedLinkedInSequenceError ? (
                <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-250 font-semibold shadow-sm">
                  {combinedLinkedInSequenceError}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {verifyingToken && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 shadow-sm animate-pulse">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
            Verifying Calendly Token...
          </div>
        )}

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
                onClick={() => setActiveTab(visibleTabs[Math.max(0, visibleTabs.indexOf(activeTab) - 1)])}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-5 font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {activeTab !== visibleTabs[visibleTabs.length - 1] ? (
              <button
                type="button"
                onClick={() => setActiveTab(visibleTabs[Math.min(visibleTabs.length - 1, visibleTabs.indexOf(activeTab) + 1)])}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-6 font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Next Step
              </button>
            ) : hideSubmit ? null : (
              <button
                type="submit"
                disabled={submitting || verifyingToken || Boolean(sequenceError) || Boolean(combinedLinkedInSequenceError)}
                className="h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 px-8 font-extrabold text-white shadow-lg shadow-indigo-600/20 transition hover:shadow-indigo-600/30 disabled:opacity-60"
              >
                {verifyingToken ? 'Verifying Token...' : submitting ? 'Launching...' : submitLabel}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
})

export default CampaignForm
