"use client"
import { useQuery } from '@tanstack/react-query'

export function useCurrentUser() {
  const query = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const r = await fetch('/api/auth/me')
      if (!r.ok) throw new Error('Failed to fetch user')
      const json = await r.json()
      return json.data
    },
    retry: 1,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  return {
    ...query,
    user: query.data,
    isAdmin: query.data?.role === 'admin'
  }
}

export default useCurrentUser
