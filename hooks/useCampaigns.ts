"use client"
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export function useCampaigns(page = 1, perPage = 25, search = '', startDate = '', endDate = '') {
  const query = useQuery({
    queryKey: ['campaigns', page, perPage, search, startDate, endDate],
    queryFn: async () => {
      const r = await axios.get('/api/campaigns', {
        params: {
          page,
          per_page: perPage,
          ...(search ? { q: search } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {})
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

export default useCampaigns
