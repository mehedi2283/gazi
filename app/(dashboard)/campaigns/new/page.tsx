"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewCampaignPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setSubmitting(true)
    setError('')

    const payload = {
      name: String(formData.get('name') || '').trim(),
      daily_limit: Number(formData.get('daily_limit') || 50),
      email_gap: Number(formData.get('email_gap') || 10),
      status: 'draft',
      campaign_schedule: {
        schedules: [
          {
            name: 'Default Schedule',
            timezone: String(formData.get('timezone') || 'Etc/GMT'),
            timing: {
              from: String(formData.get('from_time') || '09:00'),
              to: String(formData.get('to_time') || '17:00')
            },
            days: {
              monday: formData.get('monday') === 'on',
              tuesday: formData.get('tuesday') === 'on',
              wednesday: formData.get('wednesday') === 'on',
              thursday: formData.get('thursday') === 'on',
              friday: formData.get('friday') === 'on',
              saturday: formData.get('saturday') === 'on',
              sunday: formData.get('sunday') === 'on'
            }
          }
        ]
      },
      sequences: [
        {
          step_number: 1,
          subject: String(formData.get('subject') || '').trim(),
          body: String(formData.get('body') || '').trim(),
          delay_days: Number(formData.get('delay_days') || 0)
        }
      ]
    }

    if (!payload.name) {
      setError('Campaign name is required')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error?.message || json.error || 'Unable to create campaign')
      setSubmitting(false)
      return
    }

    router.push('/dashboard/campaigns')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Campaign</h1>
        <p className="text-slate-600">Create a draft campaign in Supabase. Instantly sync can be handled later.</p>
      </div>

      <form action={handleSubmit} className="space-y-6 rounded-xl bg-white p-6 shadow">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Campaign Name</span>
            <input name="name" className="w-full rounded-lg border px-3 py-2" placeholder="Apollo Outreach Campaign 1" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Timezone</span>
            <input name="timezone" className="w-full rounded-lg border px-3 py-2" defaultValue="Etc/GMT+12" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Daily Limit</span>
            <input name="daily_limit" type="number" className="w-full rounded-lg border px-3 py-2" defaultValue={50} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Email Gap</span>
            <input name="email_gap" type="number" className="w-full rounded-lg border px-3 py-2" defaultValue={10} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">From Time</span>
            <input name="from_time" className="w-full rounded-lg border px-3 py-2" defaultValue="09:00" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">To Time</span>
            <input name="to_time" className="w-full rounded-lg border px-3 py-2" defaultValue="17:00" />
          </label>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Sending Days</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <label key={day} className="flex items-center gap-2 rounded-lg border px-3 py-2 capitalize">
                <input type="checkbox" name={day} defaultChecked={['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day)} />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Sequence Step 1</h2>
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">Subject</span>
              <input name="subject" className="w-full rounded-lg border px-3 py-2" placeholder="Quick question {firstName}" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Body</span>
              <textarea name="body" className="min-h-40 w-full rounded-lg border px-3 py-2" placeholder="Hey {firstName}, ..." />
            </label>
            <label className="space-y-2 max-w-xs">
              <span className="text-sm font-medium">Delay Days</span>
              <input name="delay_days" type="number" className="w-full rounded-lg border px-3 py-2" defaultValue={0} />
            </label>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Creating...' : 'Create Campaign'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/campaigns')}
            className="rounded-lg border px-4 py-2 font-medium text-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
