"use client"
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export function useCampaigns() {
  const query = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const r = await axios.get('/api/campaigns')
      return r.data.data
    }
  })

  return query
}

export default useCampaigns
