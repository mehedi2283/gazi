"use client"
import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

function TokenRefresher() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Setup Axios response interceptor
    let isRefreshingAxios = false
    let failedAxiosQueue: any[] = []

    const processAxiosQueue = (error: any) => {
      failedAxiosQueue.forEach((prom) => {
        if (error) {
          prom.reject(error)
        } else {
          prom.resolve()
        }
      })
      failedAxiosQueue = []
    }

    const axiosInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/api/auth/refresh')) {
          if (isRefreshingAxios) {
            return new Promise((resolve, reject) => {
              failedAxiosQueue.push({ resolve, reject })
            })
              .then(() => axios(originalRequest))
              .catch((err) => Promise.reject(err))
          }

          originalRequest._retry = true
          isRefreshingAxios = true

          try {
            const res = await axios.post('/api/auth/refresh')
            if (res.status === 200) {
              processAxiosQueue(null)
              return axios(originalRequest)
            }
          } catch (err) {
            processAxiosQueue(err)
            return Promise.reject(err)
          } finally {
            isRefreshingAxios = false
          }
        }

        return Promise.reject(error)
      }
    )

    // Setup global window.fetch wrapper
    const originalFetch = window.fetch
    let isRefreshingFetch = false
    let failedFetchQueue: any[] = []

    const processFetchQueue = (error: any) => {
      failedFetchQueue.forEach((prom) => {
        if (error) {
          prom.reject(error)
        } else {
          prom.resolve()
        }
      })
      failedFetchQueue = []
    }

    window.fetch = async function (input, init) {
      try {
        const response = await originalFetch(input, init)
        const url = typeof input === 'string' ? input : (input as Request).url || ''

        if (
          response.status === 401 &&
          !url.includes('/api/auth/refresh') &&
          !url.includes('/api/auth/login')
        ) {
          if (isRefreshingFetch) {
            return new Promise((resolve, reject) => {
              failedFetchQueue.push({ resolve, reject })
            })
              .then(() => originalFetch(input, init))
              .catch((err) => {
                throw err
              })
          }

          isRefreshingFetch = true
          try {
            const refreshRes = await originalFetch('/api/auth/refresh', { method: 'POST' })
            if (refreshRes.ok) {
              processFetchQueue(null)
              return originalFetch(input, init)
            } else {
              processFetchQueue(new Error('Refresh failed'))
            }
          } catch (err) {
            processFetchQueue(err)
            throw err
          } finally {
            isRefreshingFetch = false
          }
        }

        return response
      } catch (error) {
        throw error
      }
    }

    // Background token refresher loop
    let isRefreshingTimer = false

    async function checkAndRefresh() {
      if (isRefreshingTimer) return

      const expiresAtStr = getCookie('sb-token-expires-at')
      let shouldRefresh = false

      if (expiresAtStr) {
        const expiresAt = Number(expiresAtStr)
        const now = Date.now()
        // Refresh if expiring in less than 5 minutes
        if (expiresAt - now < 5 * 60 * 1000) {
          shouldRefresh = true
        }
      } else {
        // If logged in (we have pages other than auth pages) but cookie is missing, run once to initialize
        const path = window.location.pathname
        if (path !== '/login' && path !== '/register' && path !== '/') {
          shouldRefresh = true
        }
      }

      if (shouldRefresh) {
        isRefreshingTimer = true
        try {
          const res = await originalFetch('/api/auth/refresh', { method: 'POST' })
          if (res.ok) {
            console.log('Background session refreshed successfully')
          }
        } catch (e) {
          console.error('Error during background session refresh:', e)
        } finally {
          isRefreshingTimer = false
        }
      }
    }

    // Run check on mount
    checkAndRefresh()

    // Periodically run check every 1 minute
    const interval = setInterval(checkAndRefresh, 60 * 1000)

    // Run check on page visibility change or focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh()
      }
    }
    const handleFocus = () => {
      checkAndRefresh()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)

    return () => {
      axios.interceptors.response.eject(axiosInterceptor)
      window.fetch = originalFetch
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30 seconds
            refetchOnWindowFocus: false
          }
        }
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(24, 24, 27, 0.95)',
            color: '#fafafa',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)'
          },
          success: {
            iconTheme: { primary: '#3b82f6', secondary: '#18181b' }
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#18181b' }
          }
        }}
      />
      <TokenRefresher />
      {children}
    </QueryClientProvider>
  )
}
