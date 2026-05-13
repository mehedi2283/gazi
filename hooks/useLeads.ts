"use client"
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export function useLeads(campaignId?: string) {
  const query = useQuery({
    queryKey: ['leads', campaignId || 'all'],
    queryFn: async () => {
      const r = await axios.get('/api/leads', {
        params: campaignId ? { campaign_id: campaignId } : undefined
      })
      return r.data.data
    }
  })

  return { ...query }
}

export default useLeads
