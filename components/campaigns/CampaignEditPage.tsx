"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CampaignForm from './CampaignForm'

type CampaignEditPageProps = {
  id: string
}

export default function CampaignEditPage({ id }: CampaignEditPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [campaign, setCampaign] = useState<any>(null)

  useEffect(() => {
    async function loadCampaign() {
      try {
        setLoading(true)
        const response = await fetch(`/api/campaigns/${id}`)
        const json = await response.json()

        if (!response.ok || json.error) {
          throw new Error(json.error || 'Unable to load campaign')
        }

        setCampaign(json.data)
      } catch (err: any) {
        setError(err?.message || 'Unable to load campaign')
      } finally {
        setLoading(false)
      }
    }

    loadCampaign()
  }, [id])

  async function handleSave(payload: any) {
    const response = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const json = await response.json()
    if (!response.ok || json.error) {
      throw new Error(json.error?.message || json.error || 'Unable to save campaign')
    }

    router.push('/dashboard/campaigns')
    router.refresh()
  }

  if (loading) {
    return <div className="rounded-lg bg-white p-6 shadow">Loading campaign...</div>
  }

  if (error) {
    return <div className="rounded-lg bg-white p-6 shadow text-red-600">{error}</div>
  }

  return (
    <CampaignForm
      mode="edit"
      title="Edit Campaign"
      subtitle="Update the campaign settings and sync changes with the sending provider."
      submitLabel="Save Changes"
      initialData={campaign}
      onSubmit={handleSave}
    />
  )
}