"use client"
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export function useLeads(campaignId?: string, page = 1, perPage = 25) {
  const query = useQuery({
    queryKey: ['leads', campaignId || 'all', page, perPage],
    queryFn: async () => {
      const r = await axios.get('/api/leads', {
        params: {
          ...(campaignId ? { campaign_id: campaignId } : {}),
          page,
          per_page: perPage
        }
      })
      return {
        data: r.data.data || [],
        meta: r.data.meta || { page, perPage, total: r.data.data?.length || 0 }
      }
    }
  })

  return {
    ...query,
    data: query.data?.data || [],
    meta: query.data?.meta
  }
}

export default useLeads
