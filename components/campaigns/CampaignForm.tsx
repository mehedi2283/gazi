"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Lock, Plus, Trash2 } from 'lucide-react'
import { DEFAULT_TIMEZONE, INSTANTLY_TIMEZONES } from '../../lib/timezones'

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

const CONTENT_LOCK_TOOLTIP = 'Email content is AI-personalized per lead and cannot be edited manually'

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

    try {
      await onSubmit(payload)
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