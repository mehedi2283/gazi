"use client"
import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

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
      {children}
    </QueryClientProvider>
  )
}
