"use client"
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export function useDashboardStats() {
  const query = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const r = await axios.get('/api/stats/dashboard')
      return r.data.data
    },
    // Refetch data every 5 minutes to keep it fresh
    staleTime: 1000 * 60 * 5,
  })

  return query
}

export default useDashboardStats
