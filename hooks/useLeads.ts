"use client"
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export function useLeads(
  campaignId?: string,
  page = 1,
  perPage = 25,
  options?: { search?: string; leadScore?: string; source?: string; leadTemp?: string }
) {
  const query = useQuery({
    queryKey: ['leads', campaignId || 'all', page, perPage, options?.search || '', options?.leadScore || '', options?.source || '', options?.leadTemp || ''],
    queryFn: async () => {
      const params: Record<string, any> = {
        ...(campaignId ? { campaign_id: campaignId } : {}),
        page,
        per_page: perPage
      }

      if (options?.search) params.search = options.search
      if (options?.leadScore) params.lead_gpt_score_bucket = options.leadScore
      if (options?.source) params.source = options.source
      if (options?.leadTemp) params.lead_score = options.leadTemp

      const r = await axios.get('/api/leads', { params })
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
