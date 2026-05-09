"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

export function useLeads() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const r = await axios.get('/api/leads')
      return r.data.data
    }
  })

  const add = useMutation({
    mutationFn: async (lead: any) => axios.post('/api/leads', lead),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] })
  })

  return { ...query, add }
}

export default useLeads
