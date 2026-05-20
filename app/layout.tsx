import './globals.css'
import React from 'react'
import { Inter } from 'next/font/google'
import Providers from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata = {
  title: 'GaziAI Buyer Discovery',
  description: 'AI-powered buyer discovery platform by GazI',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-canvas font-sans text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
