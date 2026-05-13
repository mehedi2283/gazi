"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import CampaignForm from '../../../../components/campaigns/CampaignForm'

export default function NewCampaignPage() {
  const router = useRouter()

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

  return (
    <div className="space-y-6">
      <CampaignForm
        mode="create"
        title="New Campaign"
        subtitle="Create an AI-personalized sequence and send it to Instantly."
        submitLabel="Launch Campaign"
        onSubmit={handleCreate}
      />
    </div>
  )
}
