"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { ChevronDown, Lock, Plus, Trash2, Paperclip, Loader2, X, Settings, Calendar, UserCircle, ListOrdered, Users } from 'lucide-react'
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

function LockedLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
      {children}
      <span className="group relative inline-flex cursor-help" tabIndex={0}>
        <Lock className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition-colors" aria-hidden="true" />
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2.5 hidden w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium leading-relaxed text-slate-600 shadow-xl transition-all animate-in fade-in slide-in-from-bottom-1 duration-200 group-hover:block group-focus:block"
        >
          {CONTENT_LOCK_TOOLTIP}
          <span className="absolute left-1/2 top-full h-1.5 w-1.5 -translate-x-1/2 -translate-y-[3px] rotate-45 border-r border-b border-slate-200 bg-white" />
        </span>
      </span>
    </span>
  )
}

const TABS = ['Basics', 'Schedule', 'Sender Profile', 'Sequences', 'Leads'] as const
type Tab = typeof TABS[number]

export default function CampaignForm({ title, subtitle, submitLabel, mode, initialData, onSubmit }: CampaignFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Basics')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState(initialData?.name || '')
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
    booking_calendar_link: '',
    signature: '',
    signature_url: ''
  })
  const [reportEmail, setReportEmail] = useState(initialData?.report_email || '')
  const [targetLeadCount, setTargetLeadCount] = useState(String(initialData?.target_lead_count ?? 100))
  const [attachmentUrl, setAttachmentUrl] = useState(initialData?.attachment_url || '')
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countryHighlight, setCountryHighlight] = useState(0)
  const [timePickerOpen, setTimePickerOpen] = useState<null | 'from' | 'to'>(null)
  const countryRef = React.useRef<HTMLDivElement | null>(null)
  const emailPickerRef = React.useRef<HTMLDivElement | null>(null)
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
    setAttachmentUrl(initialData?.attachment_url || '')
    setSenderInfo((prev) => ({
      ...prev,
      signature: initialData?.signature || ''
    }))
    setReportEmail(initialData?.report_email || '')
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

  const handleLeadFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLeadFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result
      if (typeof content !== 'string') return

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const parsed = Papa.parse(content, { header: true, skipEmptyLines: true })
        setLeadRows(parsed.data as Record<string, any>[])
      } else {
        const workbook = XLSX.read(content, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet)
        setLeadRows(data as Record<string, any>[])
      }
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
      setError('Country and product name are required for External lead creation')
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
        report_email: reportEmail.trim() || null,
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
          signature_url: senderInfo.signature_url
        },
        lead_creation: leadCreation,
        lead_creation_mode: leadMode,
        target_lead_count: Number(targetLeadCount || 0),
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
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">{title}</h1>
        <p className="mt-1 text-zinc-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-4">
        {(
          [
            { id: 'Basics', icon: Settings },
            { id: 'Schedule', icon: Calendar },
            { id: 'Sender Profile', icon: UserCircle },
            { id: 'Sequences', icon: ListOrdered },
            { id: 'Leads', icon: Users }
          ] as const
        ).map((tab) => (
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
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-100 text-slate-400 group-hover:text-slate-650'
              }`}
            >
              <tab.icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="relative z-10 whitespace-nowrap">{tab.id}</span>
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-glass backdrop-blur-xl"
      >
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
                  <input name="name" value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium" placeholder="GaziAI Buyer Discovery 1" />
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Target Lead Count</span>
                  <input name="target_lead_count" type="number" min={0} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium" value={targetLeadCount} onChange={(event) => setTargetLeadCount(event.target.value)} placeholder="100" />
                  <p className="text-xs text-slate-400 font-medium">Total number of leads to fetch</p>
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Daily Limit</span>
                    <input name="daily_limit" type="number" min={1} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium" value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Email Gap (mins)</span>
                    <input name="email_gap" type="number" min={0} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium" value={emailGap} onChange={(event) => setEmailGap(event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-750 transition hover:bg-slate-50 cursor-pointer shadow-sm">
                  <input type="checkbox" name="stop_on_reply" checked={stopOnReply} onChange={(event) => setStopOnReply(event.target.checked)} className="h-4 w-4 rounded border-slate-350 bg-transparent text-indigo-650 focus:ring-indigo-500/20" />
                  <span className="text-sm font-bold">Stop On Reply</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-750 transition hover:bg-slate-50 cursor-pointer shadow-sm">
                  <input type="checkbox" name="open_tracking" checked={openTracking} onChange={(event) => setOpenTracking(event.target.checked)} className="h-4 w-4 rounded border-slate-350 bg-transparent text-indigo-650 focus:ring-indigo-500/20" />
                  <span className="text-sm font-bold">Open Tracking</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-750 transition hover:bg-slate-50 cursor-pointer shadow-sm">
                  <input type="checkbox" name="link_tracking" checked={linkTracking} onChange={(event) => setLinkTracking(event.target.checked)} className="h-4 w-4 rounded border-slate-350 bg-transparent text-indigo-650 focus:ring-indigo-500/20" />
                  <span className="text-sm font-bold">Link Tracking</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Schedule' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Sending Schedule</h2>
                <p className="text-sm text-slate-400 font-medium">Define the timezone, window, and days for sending emails.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <label className="space-y-2 md:col-span-3">
                  <span className="text-sm font-semibold text-slate-700">Timezone</span>
                  <select name="timezone" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                    {INSTANTLY_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </label>
                
                <div ref={timePickerRef} className="md:col-span-2 grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">From Time</span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTimePickerOpen((current) => (current === 'from' ? null : 'from'))}
                        className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-slate-850 shadow-sm outline-none transition hover:border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-medium"
                      >
                        <span>{formatTimeLabel(fromTime)}</span>
                        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </button>

                      {timePickerOpen === 'from' ? (
                        <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
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
                        className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-slate-850 shadow-sm outline-none transition hover:border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-medium"
                      >
                        <span>{formatTimeLabel(toTime)}</span>
                        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </button>

                      {timePickerOpen === 'to' ? (
                        <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
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
                <h3 className="text-sm font-bold text-slate-700">Sending Days</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                    <label key={day} className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 text-sm capitalize transition-all ${days[day] ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20 font-bold shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350 shadow-sm font-semibold'}`}>
                      <input
                        type="checkbox"
                        name={day}
                        checked={days[day]}
                        onChange={(event) => setDays((current) => ({ ...current, [day]: event.target.checked }))}
                        className="sr-only"
                      />
                      <span className="font-semibold">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Sender Profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Sender Information</h2>
                <p className="text-sm text-slate-400 font-medium">Details sent with the campaign webhook for AI personalization and reporting.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Sender Name</span>
                  <input
                    value={senderInfo.name}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
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
                    className="w-full rounded-md border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
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
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                    placeholder="Company name"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Location</span>
                  <input
                    value={senderInfo.location}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, location: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                    placeholder="City, Country"
                    required
                  />
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Address</span>
                  <input
                    value={senderInfo.address}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, address: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                    placeholder="Street address"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Booking Calendar Link</span>
                  <input
                    value={senderInfo.booking_calendar_link}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, booking_calendar_link: event.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                    placeholder="https://cal.com/..."
                    required
                  />
                </label>
 
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Company Details</span>
                  <textarea
                    value={senderInfo.company_details}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, company_details: event.target.value }))}
                    className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                    placeholder="Share the company summary, positioning, or offer context"
                  />
                </label>
 
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Long Message</span>
                  <textarea
                    value={senderInfo.long_message}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, long_message: event.target.value }))}
                    className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                    placeholder="Paste the long-form sender note or outreach message"
                  />
                </label>
 
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Text Signature</span>
                  <textarea
                    value={senderInfo.signature}
                    onChange={(event) => setSenderInfo((current) => ({ ...current, signature: event.target.value }))}
                    className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                    placeholder="Best regards, ... "
                  />
                </label>
 
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <span className="text-sm font-semibold text-slate-700">Attachment (Optional)</span>
                  <div className="flex items-center gap-3">
                    {attachmentUrl ? (
                      <div className="flex flex-1 items-center justify-between rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 shadow-sm">
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
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-6 transition hover:border-indigo-500 hover:bg-indigo-50/20 shadow-sm">
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
                      <div className="flex flex-1 items-center justify-between rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img src={senderInfo.signature_url} alt="Signature" className="h-10 w-auto rounded border border-slate-200 bg-white" />
                          <span className="truncate text-xs text-indigo-700 font-semibold">Signature uploaded</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSenderInfo(prev => ({ ...prev, signature_url: '' }))}
                          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-650"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-4 transition hover:border-indigo-500 hover:bg-indigo-50/20 shadow-sm">
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Sequence Setup</h2>
                  <p className="text-sm text-slate-400 font-medium">Configure delays for your automated email steps.</p>
                </div>
                <button
                  type="button"
                  onClick={addStep}
                  className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors"
                >
                  <Plus className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  Add Step
                </button>
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => {
                  const stepNumber = index + 1
                  const minimumDelay = index === 0 ? 0 : (steps[index - 1]?.delay_days ?? 0) + 1

                  return (
                    <div key={stepNumber} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm relative group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs text-indigo-650 font-bold">{stepNumber}</span>
                          Step {stepNumber}
                        </h3>
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-650 hover:bg-red-50 transition"
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
                            className="w-full rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-slate-400 font-medium"
                          />
                        </label>

                        <label className="space-y-2">
                          <LockedLabel>Body</LockedLabel>
                          <input
                            value={getBodyVariable(stepNumber)}
                            disabled
                            readOnly
                            className="w-full rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-slate-400 font-medium"
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
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>

              {sequenceError ? (
                <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-250 font-semibold shadow-sm">
                  {sequenceError}
                </div>
              ) : null}
              
              <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-inner">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Launch Preview</h3>
                <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
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
                            <td className="px-4 py-2.5 text-indigo-650 font-bold font-mono">{index === 0 ? 0 : step.delay_days}</td>
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
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Leads & Account</h2>
                <p className="text-sm text-slate-400 font-medium">Configure how leads are added to this campaign and what account sends them.</p>
              </div>

              <div className="space-y-3">
                <span className="text-sm font-semibold text-slate-700">Sending Email Account</span>
                <div className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
                  <div ref={emailPickerRef} className="relative w-full">
                    <button
                      type="button"
                      onClick={() => setEmailMenuOpen((current) => !current)}
                      className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-4 text-left text-sm text-slate-800 shadow-sm transition hover:border-slate-350"
                    >
                      <span className="truncate">
                        {selectedEmail
                          ? selectedEmailAccount
                            ? `${selectedEmailAccount.account_name || selectedEmailAccount.email_address} (${selectedEmailAccount.email_address})`
                            : selectedEmail
                          : 'No sender selected'}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </button>

                    {emailMenuOpen && (
                      <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
                        <button
                          type="button"
                          className={`flex w-full items-center px-4 py-2 text-left text-sm hover:bg-slate-50 ${!selectedEmail ? 'font-semibold text-indigo-600' : 'text-slate-700'}`}
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
                                className={`min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 ${selectedEmail.toLowerCase() === account.email_address.toLowerCase() ? 'font-semibold text-indigo-600' : 'text-slate-700'}`}
                                onClick={() => {
                                  setSelectedEmail(account.email_address)
                                  setNewEmailAddress('')
                                  setNewEmailName('')
                                  setEmailMenuOpen(false)
                                }}
                              >
                                <span className="block truncate font-semibold">{account.account_name || account.email_address}</span>
                                <span className="block truncate text-xs font-normal text-slate-400">{account.email_address}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleDeleteEmailAccount(account)
                                }}
                                disabled={deletingEmailId === account.id}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-650 disabled:opacity-50"
                                aria-label={`Delete ${account.email_address}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-slate-400 font-medium">No saved email accounts</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-[minmax(260px,1fr)_minmax(180px,240px)_auto]">
                    <input
                      type="email"
                      value={newEmailAddress}
                      onChange={(event) => setNewEmailAddress(event.target.value)}
                      placeholder="Or enter new email: new@email.com"
                      className="h-11 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 shadow-sm"
                    />
                    <input
                      type="text"
                      value={newEmailName}
                      onChange={(event) => setNewEmailName(event.target.value)}
                      placeholder="Account Name"
                      className="h-11 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddEmailAccount}
                      disabled={addingEmail || !newEmailAddress.trim()}
                      className="h-11 rounded-md bg-white border border-slate-200 hover:bg-slate-50 px-5 text-sm font-semibold text-slate-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      Use
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Lead Source</h3>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  {LEAD_MODE_OPTIONS.map((option) => (
                    <label key={option.value} className={`relative flex cursor-pointer rounded-xl border p-4 transition-all ${leadMode === option.value ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-350 shadow-sm'}`}>
                      <input
                        type="radio"
                        name="lead_mode"
                        className="sr-only"
                        checked={leadMode === option.value}
                        onChange={() => setLeadMode(option.value)}
                      />
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

                {leadMode === 'apollo' && (
                  <div className="grid gap-6 md:grid-cols-2 animate-in fade-in duration-300 p-5 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
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
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                          placeholder="e.g. United States"
                        />
                        {countryOpen && filteredCountries.length > 0 && (
                          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
                            {filteredCountries.slice(0, 100).map((country, index) => (
                              <li
                                key={country}
                                onMouseEnter={() => setCountryHighlight(index)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setApolloLead((current) => ({ ...current, market_name: country }))
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
                        value={apolloLead.product_name}
                        onChange={(event) => setApolloLead((current) => ({ ...current, product_name: event.target.value }))}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-850 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                        placeholder="e.g. AI CRM Automation"
                      />
                    </label>
                  </div>
                )}

                {leadMode === 'import' && (
                  <div className="space-y-4 animate-in fade-in duration-300 p-5 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
                    <label className="space-y-2 block">
                      <span className="text-sm font-semibold text-slate-700">Upload CSV or Spreadsheet</span>
                      <input
                        type="file"
                        accept=".csv,.txt,.xlsx,.xls"
                        onChange={handleLeadFileChange}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 shadow-sm font-medium"
                      />
                    </label>
                    {leadFileName && (
                      <div className="flex items-center gap-3 rounded-md border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-bold shadow-sm">
                        <span className="font-semibold">{leadFileName}</span>
                        <span className="text-emerald-600/80">• {leadRows.length} rows loaded</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-750 border border-red-200 flex items-center gap-2 font-semibold shadow-sm animate-bounce">
            <span className="font-extrabold text-red-800">Error:</span> {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
          <div className="flex items-center gap-2">
            {activeTab !== 'Basics' && (
              <button
                type="button"
                onClick={() => setActiveTab(TABS[Math.max(0, TABS.indexOf(activeTab) - 1)])}
                className="rounded-lg bg-white border border-slate-200 px-5 py-2.5 font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm"
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
                className="rounded-lg bg-white border border-slate-200 px-6 py-2.5 font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm"
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || Boolean(sequenceError)}
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 px-8 py-2.5 font-extrabold text-white shadow-md shadow-indigo-600/10 transition hover:opacity-95 hover:shadow-indigo-600/20 disabled:opacity-60"
              >
                {submitting ? 'Launching...' : submitLabel}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
