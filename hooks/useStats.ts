"use client"
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export function useStats() {
  const query = useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: async () => {
      const r = await axios.get('/api/stats/dashboard')
      return r.data.data
    }
  })

  return query
}

export default useStats
