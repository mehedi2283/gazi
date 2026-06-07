"use client"

import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Mail } from 'lucide-react'
import CampaignForm, { type CampaignFormHandle } from '../../../../components/campaigns/CampaignForm'
import LinkedCampaign, { type LinkedCampaignHandle } from '../../../../components/campaigns/LinkedCampaign'

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 382 382"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M347.445,0H34.555C15.471,0,0,15.471,0,34.555v312.889C0,366.529,15.471,382,34.555,382h312.889 C366.529,382,382,366.529,382,347.444V34.555C382,15.471,366.529,0,347.445,0z M118.207,329.844c0,5.554-4.502,10.056-10.056,10.056 H65.345c-5.554,0-10.056-4.502-10.056-10.056V150.403c0-5.554,4.502-10.056,10.056-10.056h42.806 c5.554,0,10.056,4.502,10.056,10.056V329.844z M86.748,123.432c-22.459,0-40.666-18.207-40.666-40.666S64.289,42.1,86.748,42.1 s40.666,18.207,40.666,40.666S109.208,123.432,86.748,123.432z M341.91,330.654c0,5.106-4.14,9.246-9.246,9.246H286.73 c-5.106,0-9.246-4.14-9.246-9.246v-84.168c0-12.556,3.683-55.021-32.813-55.021c-28.309,0-34.051,29.066-35.204,42.11v97.079 c0,5.106-4.139,9.246-9.246,9.246h-44.426c-5.106,0-9.246-4.14-9.246-9.246V149.593c0-5.106,4.14-9.246,9.246-9.246h44.426 c5.106,0,9.246,4.14,9.246,9.246v15.655c10.497-15.753,26.097-27.912,59.312-27.912c73.552,0,73.131,68.716,73.131,106.472 L341.91,330.654L341.91,330.654z"
      />
    </svg>
  )
}

export default function NewCampaignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const channel = searchParams?.get('channel') || 'email'
  const [combinedTab, setCombinedTab] = React.useState<'email' | 'linkedin'>('email')
  const [launchingBoth, setLaunchingBoth] = React.useState(false)
  const emailFormRef = React.useRef<CampaignFormHandle>(null)
  const linkedInFormRef = React.useRef<LinkedCampaignHandle>(null)

  async function handleCreate(payload: any) {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      throw new Error(json.error?.message || json.error || 'Unable to launch campaign')
    }

    const campaign = json.data

    router.push(`/dashboard/campaigns/${campaign.id}`)
    router.refresh()
  }

  async function handleCreateEmailOnly(payload: any) {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      throw new Error(json.error?.message || json.error || 'Unable to launch email campaign')
    }
  }

  async function handleLaunchBoth() {
    const isEmailValid = emailFormRef.current?.validate() ?? false
    const isLinkedInValid = linkedInFormRef.current?.validate() ?? false

    if (!isEmailValid) {
      setCombinedTab('email')
      return
    }

    if (!isLinkedInValid) {
      setCombinedTab('linkedin')
      return
    }

    setLaunchingBoth(true)
    try {
      await emailFormRef.current?.submit()
      await linkedInFormRef.current?.submit()
      router.push('/dashboard/campaigns')
      router.refresh()
    } catch {
      // Child forms render their own validation/API errors.
    } finally {
      setLaunchingBoth(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaigns
      </Link>

      {channel === 'linkedin' ? (
        <LinkedCampaign />
      ) : channel === 'both' ? (
        <div className="space-y-6">
          <div className="inline-flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => setCombinedTab('email')}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                combinedTab === 'email'
                  ? 'text-indigo-600 bg-indigo-50 font-bold border border-indigo-100 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-850'
              }`}
            >
              <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                combinedTab === 'email'
                  ? 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-100 text-slate-400 group-hover:text-slate-650'
              }`}>
                <Mail className="h-4 w-4" />
              </span>
              Email
            </button>
            <button
              type="button"
              onClick={() => setCombinedTab('linkedin')}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                combinedTab === 'linkedin'
                  ? 'text-indigo-600 bg-indigo-50 font-bold border border-indigo-100 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-850'
              }`}
            >
              <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                combinedTab === 'linkedin'
                  ? 'bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-slate-100 text-slate-400 group-hover:text-slate-650'
              }`}>
                <LinkedInIcon className="h-4 w-4" />
              </span>
              LinkedIn
            </button>
          </div>

          <div className={combinedTab === 'email' ? 'block' : 'hidden'}>
            <CampaignForm
              ref={emailFormRef}
              mode="create"
              title="New Email Campaign"
              subtitle="Create an AI-personalized email sequence and launch it with your connected sending account."
              submitLabel="Launch Email Campaign"
              hideSubmit
              onSubmit={handleCreateEmailOnly}
            />
          </div>

          <div className={combinedTab === 'linkedin' ? 'block' : 'hidden'}>
            <LinkedCampaign
              ref={linkedInFormRef}
              hideSubmit
              onSuccess={() => {}}
            />
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={handleLaunchBoth}
              disabled={launchingBoth}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 px-8 py-2.5 font-extrabold text-white shadow-md shadow-indigo-600/10 transition hover:opacity-95 hover:shadow-indigo-600/20 disabled:opacity-60"
            >
              {launchingBoth ? 'Launching...' : 'Launch Email + LinkedIn'}
            </button>
          </div>
        </div>
      ) : (
        <CampaignForm
          mode="create"
          title="New Campaign"
          subtitle="Create an AI-personalized sequence and launch it with your connected sending account."
          submitLabel="Launch Campaign"
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}
