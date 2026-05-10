import React from 'react'
import CampaignEditPage from '../../../../../components/campaigns/CampaignEditPage'

export default function EditCampaignRoute({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <CampaignEditPage id={params.id} />
    </div>
  )
}