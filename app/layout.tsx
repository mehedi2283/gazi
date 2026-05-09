import './globals.css'
import React from 'react'
import Providers from './providers'

export const metadata = {
  title: 'LeadGen AI'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
