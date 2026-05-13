"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { ChevronDown, Lock, Plus, Trash2 } from 'lucide-react'
import { DEFAULT_TIMEZONE, INSTANTLY_TIMEZONES } from '../../lib/timezones'

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
}

type CampaignFormProps = {
  title: string
  subtitle: string
  submitLabel: string
  mode: 'create' | 'edit'
  initialData?: CampaignInitialData | null
  onSubmit: (payload: any) => Promise<void>
}

const LEAD_MODE_OPTIONS: Array<{ value: LeadCreationMode; label: string; description: string }> = [
  { value: 'apollo', label: 'Apollo', description: 'Send country and product data to the webhook' },
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

function getSubjectVariable(stepNumber: number) {
  return `{{custom_subject_${stepNumber}}}`
}

function getBodyVariable(stepNumber: number) {
  return `{{personalization_${stepNumber}}}`
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

function LockedLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-sm font-medium">
      {children}
      <span className="group relative inline-flex" tabIndex={0}>
        <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-64 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-2 text-xs font-normal leading-5 text-white shadow-lg group-hover:block group-focus:block"
        >
          {CONTENT_LOCK_TOOLTIP}
        </span>
      </span>
    </span>
  )
}

export default function CampaignForm({ title, subtitle, submitLabel, mode, initialData, onSubmit }: CampaignFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState(initialData?.name || '')
  const [timezone, setTimezone] = useState(initialData?.timezone || DEFAULT_TIMEZONE)
  const [dailyLimit, setDailyLimit] = useState(String(initialData?.daily_limit ?? 50))
  const [emailGap, setEmailGap] = useState(String(initialData?.email_gap ?? 10))
  const [fromTime, setFromTime] = useState(initialData?.from_time || '09:00')
  const [toTime, setToTime] = useState(initialData?.to_time || '17:00')
  const [stopOnReply, setStopOnReply] = useState(initialData?.stop_on_reply ?? true)
  const [openTracking, setOpenTracking] = useState(initialData?.open_tracking ?? false)
  const [linkTracking, setLinkTracking] = useState(initialData?.link_tracking ?? true)
  const [leadMode, setLeadMode] = useState<LeadCreationMode>('apollo')
  const [leadRows, setLeadRows] = useState<Record<string, any>[]>([])
  const [leadFileName, setLeadFileName] = useState('')
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [selectedEmail, setSelectedEmail] = useState('')
  const [newEmailAddress, setNewEmailAddress] = useState('')
  const [newEmailName, setNewEmailName] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [emailMenuOpen, setEmailMenuOpen] = useState(false)
  const [deletingEmailId, setDeletingEmailId] = useState('')
  const [apolloLead, setApolloLead] = useState({
    market_name: '',
    product_name: ''
  })
  const [senderInfo, setSenderInfo] = useState({
    name: '',
    company: '',
    company_details: '',
    long_message: '',
    location: '',
    address: '',
    booking_calendar_link: ''
  })
  const [countryOpen, setCountryOpen] = useState(false)
  const [countryHighlight, setCountryHighlight] = useState(0)
  const countryRef = React.useRef<HTMLDivElement | null>(null)
  const emailPickerRef = React.useRef<HTMLDivElement | null>(null)
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

  function selectTypedEmail() {
    const normalizedEmail = newEmailAddress.trim().toLowerCase()

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    setSelectedEmail(normalizedEmail)
    setEmailMenuOpen(false)
  }

  async function handleAddEmailAccount() {
    if (!newEmailAddress.trim()) {
      toast.error('Please provide an email address')
      return
    }

    if (!EMAIL_REGEX.test(newEmailAddress.trim().toLowerCase())) {
      toast.error('Please enter a valid email address')
      return
    }

    setAddingEmail(true)
    try {
      selectTypedEmail()
    } catch (err: any) {
      console.error('Failed to use email account:', err)
      toast.error(err?.message || 'Failed to use email account')
    } finally {
      setAddingEmail(false)
    }
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
      if (selectedEmail.toLowerCase() === account.email_address.toLowerCase()) {
        setSelectedEmail('')
      }
      toast.success('Email account deleted')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete email account')
    } finally {
      setDeletingEmailId('')
    }
  }

  useEffect(() => {
    setName(initialData?.name || '')
    setTimezone(initialData?.timezone || DEFAULT_TIMEZONE)
    setDailyLimit(String(initialData?.daily_limit ?? 50))
    setEmailGap(String(initialData?.email_gap ?? 10))
    setFromTime(initialData?.from_time || '09:00')
    setToTime(initialData?.to_time || '17:00')
    setStopOnReply(initialData?.stop_on_reply ?? true)
    setOpenTracking(initialData?.open_tracking ?? false)
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
    setError('')
  }, [initialData])

  const sequenceError = useMemo(() => getSequenceError(steps), [steps])
  const selectedEmailAccount = useMemo(() => {
    return emailAccounts.find((account) => account.email_address.toLowerCase() === selectedEmail.toLowerCase()) || null
  }, [emailAccounts, selectedEmail])
  const filteredCountries = useMemo(() => {
    const query = apolloLead.market_name.trim().toLowerCase()
    if (!query) return COUNTRY_OPTIONS
    return COUNTRY_OPTIONS.filter((country) => country.toLowerCase().includes(query))
  }, [apolloLead.market_name])

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
    function handleOutsideClick(event: MouseEvent) {
      if (!emailPickerRef.current) return
      if (!emailPickerRef.current.contains(event.target as Node)) {
        setEmailMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
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

  async function handleLeadFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase()

    try {
      if (extension === 'csv' || extension === 'txt') {
        const text = await file.text()
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        setLeadRows((parsed.data as Record<string, any>[]) || [])
        setLeadFileName(file.name)
        return
      }

      if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.SheetNames[0]
        const sheet = workbook.Sheets[firstSheet]
        const json = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[]
        setLeadRows(json || [])
        setLeadFileName(file.name)
        return
      }

      toast.error('Please upload a CSV or Excel file')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to parse lead file')
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const validationError = getSequenceError(steps)
    if (validationError) {
      setError(validationError)
      setSubmitting(false)
      return
    }

    const payload = {
      name: name.trim(),
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

    const typedEmail = newEmailAddress.trim().toLowerCase()
    let sendingEmail = selectedEmail.trim().toLowerCase()
    let sendingEmailAccountName = selectedEmailAccount?.account_name || sendingEmail

    if (typedEmail) {
      if (!EMAIL_REGEX.test(typedEmail)) {
        setError('Please enter a valid sending email address')
        setSubmitting(false)
        return
      }

      sendingEmail = typedEmail
      sendingEmailAccountName = newEmailName.trim() || typedEmail
    }

    if (leadMode === 'apollo' && (!apolloLead.market_name.trim() || !apolloLead.product_name.trim())) {
      setError('Country and product name are required for Apollo lead creation')
      setSubmitting(false)
      return
    }

    if (leadMode === 'import' && !leadRows.length) {
      setError('Upload a CSV or spreadsheet before creating imported leads')
      setSubmitting(false)
      return
    }

    if (!senderInfo.name.trim() || !senderInfo.company.trim() || !senderInfo.location.trim() || !senderInfo.address.trim() || !senderInfo.booking_calendar_link.trim()) {
      setError('Complete sender information is required')
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

    try {
      await onSubmit({
        ...payload,
        sender_info: {
          name: senderInfo.name.trim(),
          company: senderInfo.company.trim(),
          company_details: senderInfo.company_details.trim(),
          long_message: senderInfo.long_message.trim(),
          location: senderInfo.location.trim(),
          address: senderInfo.address.trim(),
          booking_calendar_link: senderInfo.booking_calendar_link.trim()
        },
        lead_creation: leadCreation,
        lead_creation_mode: leadMode,
        ...(sendingEmail ? {
          sending_email: sendingEmail,
          sending_email_account_name: sendingEmailAccountName
        } : {})
      })
    } catch (err: any) {
      setError(err?.message || 'Unable to save campaign')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-slate-600">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Campaign Name</span>
            <input name="name" value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border px-3 py-2" placeholder="Apollo Outreach Campaign 1" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Timezone</span>
            <select name="timezone" className="w-full rounded-lg border px-3 py-2" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {INSTANTLY_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Daily Limit</span>
            <input name="daily_limit" type="number" min={1} className="w-full rounded-lg border px-3 py-2" value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Email Gap</span>
            <input name="email_gap" type="number" min={0} className="w-full rounded-lg border px-3 py-2" value={emailGap} onChange={(event) => setEmailGap(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">From Time</span>
            <input name="from_time" className="w-full rounded-lg border px-3 py-2" value={fromTime} onChange={(event) => setFromTime(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">To Time</span>
            <input name="to_time" className="w-full rounded-lg border px-3 py-2" value={toTime} onChange={(event) => setToTime(event.target.value)} />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <input type="checkbox" name="stop_on_reply" checked={stopOnReply} onChange={(event) => setStopOnReply(event.target.checked)} />
            <span className="text-sm font-medium">Stop On Reply</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <input type="checkbox" name="open_tracking" checked={openTracking} onChange={(event) => setOpenTracking(event.target.checked)} />
            <span className="text-sm font-medium">Open Tracking</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <input type="checkbox" name="link_tracking" checked={linkTracking} onChange={(event) => setLinkTracking(event.target.checked)} />
            <span className="text-sm font-medium">Link Tracking</span>
          </label>
        </div>

        <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <div>
            <h2 className="text-lg font-semibold">Sender Information</h2>
            <p className="text-sm text-slate-600">This section is required and will be sent with the campaign webhook after the campaign is created.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Sender Name</span>
              <input
                value={senderInfo.name}
                onChange={(event) => setSenderInfo((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="John Doe"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Company</span>
              <input
                value={senderInfo.company}
                onChange={(event) => setSenderInfo((current) => ({ ...current, company: event.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Company name"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Location</span>
              <input
                value={senderInfo.location}
                onChange={(event) => setSenderInfo((current) => ({ ...current, location: event.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="City, Country"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Address</span>
              <input
                value={senderInfo.address}
                onChange={(event) => setSenderInfo((current) => ({ ...current, address: event.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Street address"
                required
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Booking Calendar Link</span>
              <input
                value={senderInfo.booking_calendar_link}
                onChange={(event) => setSenderInfo((current) => ({ ...current, booking_calendar_link: event.target.value }))}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="https://cal.com/..."
                required
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Company Details</span>
              <textarea
                value={senderInfo.company_details}
                onChange={(event) => setSenderInfo((current) => ({ ...current, company_details: event.target.value }))}
                className="min-h-28 w-full rounded-lg border px-3 py-2"
                placeholder="Share the company summary, positioning, or offer context"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Long Message</span>
              <textarea
                value={senderInfo.long_message}
                onChange={(event) => setSenderInfo((current) => ({ ...current, long_message: event.target.value }))}
                className="min-h-28 w-full rounded-lg border px-3 py-2"
                placeholder="Paste the long-form sender note or outreach message"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Sending Days</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
              <label key={day} className="flex items-center gap-2 rounded-lg border px-3 py-2 capitalize">
                <input
                  type="checkbox"
                  name={day}
                  checked={days[day]}
                  onChange={(event) => setDays((current) => ({ ...current, [day]: event.target.checked }))}
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Sequence Setup</h2>
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
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
                <div key={stepNumber} className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">Step {stepNumber}</h3>
                    {index > 0 ? (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Remove Step
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px]">
                    <label className="space-y-2">
                      <LockedLabel>Subject</LockedLabel>
                      <input
                        value={getSubjectVariable(stepNumber)}
                        disabled
                        readOnly
                        className="w-full rounded-lg border bg-slate-100 px-3 py-2 text-slate-700"
                      />
                    </label>

                    <label className="space-y-2">
                      <LockedLabel>Body</LockedLabel>
                      <input
                        value={getBodyVariable(stepNumber)}
                        disabled
                        readOnly
                        className="w-full rounded-lg border bg-slate-100 px-3 py-2 text-slate-700"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium">Day</span>
                      <input
                        type="number"
                        min={minimumDelay}
                        value={index === 0 ? 0 : step.delay_days}
                        disabled={index === 0}
                        onChange={(event) => updateDelay(index, event.target.value)}
                        className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>

          {sequenceError ? <p className="text-sm text-red-600">{sequenceError}</p> : null}
        </div>

        <div className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
          <div>
            <h2 className="text-lg font-semibold">Lead Creation</h2>
            <p className="text-sm text-slate-600">Choose whether this campaign should create leads immediately after the campaign is created.</p>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Sending Email Account</span>
            <div className="grid max-w-5xl gap-3 xl:grid-cols-[minmax(280px,360px)_minmax(520px,1fr)]">
              <div ref={emailPickerRef} className="relative w-full">
                <button
                  type="button"
                  onClick={() => setEmailMenuOpen((current) => !current)}
                  className="flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-left text-sm text-slate-800 shadow-sm"
                >
                  <span className="truncate">
                    {selectedEmail
                      ? selectedEmailAccount
                        ? `${selectedEmailAccount.account_name || selectedEmailAccount.email_address} (${selectedEmailAccount.email_address})`
                        : selectedEmail
                      : 'No sender selected'}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                </button>

                {emailMenuOpen ? (
                  <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-slate-50 ${!selectedEmail ? 'font-semibold text-indigo-700' : 'text-slate-700'}`}
                      onClick={() => {
                        setSelectedEmail('')
                        setNewEmailAddress('')
                        setNewEmailName('')
                        setEmailMenuOpen(false)
                      }}
                    >
                      No sender selected
                    </button>

                    {emailAccounts.length ? (
                      emailAccounts.map((account) => (
                        <div key={account.id} className="flex items-center gap-1 px-1">
                          <button
                            type="button"
                            className={`min-w-0 flex-1 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50 ${selectedEmail.toLowerCase() === account.email_address.toLowerCase() ? 'font-semibold text-indigo-700' : 'text-slate-700'}`}
                            onClick={() => {
                              setSelectedEmail(account.email_address)
                              setNewEmailAddress('')
                              setNewEmailName('')
                              setEmailMenuOpen(false)
                            }}
                          >
                            <span className="block truncate">{account.account_name || account.email_address}</span>
                            <span className="block truncate text-xs font-normal text-slate-500">{account.email_address}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDeleteEmailAccount(account)
                            }}
                            disabled={deletingEmailId === account.id}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            aria-label={`Delete ${account.email_address}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-500">No saved email accounts</div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-[minmax(260px,1fr)_minmax(180px,240px)_56px]">
                <input
                  type="email"
                  value={newEmailAddress}
                  onChange={(event) => setNewEmailAddress(event.target.value)}
                  placeholder="new@email.com"
                  className="h-10 min-w-0 rounded-lg border bg-white px-3 text-sm"
                />
                <input
                  type="text"
                  value={newEmailName}
                  onChange={(event) => setNewEmailName(event.target.value)}
                  placeholder="Name"
                  className="h-10 min-w-0 rounded-lg border bg-white px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddEmailAccount}
                  disabled={addingEmail || !newEmailAddress.trim()}
                  className="h-10 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  Use
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {LEAD_MODE_OPTIONS.map((option) => (
              <label key={option.value} className={`rounded-lg border px-4 py-3 ${leadMode === option.value ? 'border-indigo-600 bg-white' : 'bg-white/80'}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="lead_mode"
                    checked={leadMode === option.value}
                    onChange={() => setLeadMode(option.value)}
                  />
                  <span className="font-medium">{option.label}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{option.description}</p>
              </label>
            ))}
          </div>

          {leadMode === 'apollo' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Country</span>
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
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="United States"
                    aria-autocomplete="list"
                    aria-expanded={countryOpen}
                    aria-controls="country-listbox"
                    role="combobox"
                  />
                  {countryOpen && filteredCountries.length > 0 ? (
                    <ul id="country-listbox" role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                      {filteredCountries.slice(0, 100).map((country, index) => (
                        <li
                          key={country}
                          role="option"
                          aria-selected={index === countryHighlight}
                          onMouseEnter={() => setCountryHighlight(index)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setApolloLead((current) => ({ ...current, market_name: country }))
                            setCountryOpen(false)
                          }}
                          className={`cursor-pointer px-3 py-2 text-sm ${index === countryHighlight ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                        >
                          {country}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Product name</span>
                <input
                  value={apolloLead.product_name}
                  onChange={(event) => setApolloLead((current) => ({ ...current, product_name: event.target.value }))}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="e.g. CRM automation"
                />
              </label>
            </div>
          ) : null}

          {leadMode === 'import' ? (
            <div className="space-y-3">
              <label className="space-y-2 block">
                <span className="text-sm font-medium">Upload CSV or Spreadsheet</span>
                <input
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={handleLeadFileChange}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </label>
              <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {leadFileName ? `Loaded file: ${leadFileName}` : 'No lead file loaded yet'}
                <span className="ml-2">{leadRows.length} rows ready</span>
              </div>
            </div>
          ) : null}

        </div>

        <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
          <h2 className="text-lg font-semibold">Launch Preview</h2>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
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
                    <tr key={`preview-${stepNumber}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">Step {stepNumber}</td>
                      <td className="px-4 py-3 text-slate-700">{index === 0 ? 0 : step.delay_days}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{getSubjectVariable(stepNumber)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{getBodyVariable(stepNumber)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || Boolean(sequenceError)}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
