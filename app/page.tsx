import React from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 main-bg">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold mb-4 text-slate-800">GaziAI Buyer Discovery</h1>
        <p className="text-slate-600 mb-6">SaaS outreach platform scaffold.</p>
        <div className="space-x-4">
          <Link href="/login" className="px-4 py-2 bg-indigo-600 text-white rounded">Get Started</Link>
        </div>
      </div>
    </main>
  )
}
