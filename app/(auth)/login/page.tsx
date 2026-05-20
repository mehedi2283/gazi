'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const json = await response.json()

      if (!response.ok || json.error) {
        throw new Error(json.error?.message || json.error || 'Unable to sign in')
      }

      const params = new URLSearchParams(window.location.search)
      const next = params.get('next')
      const role = String(json.data?.user?.role || '').toLowerCase()
      const fallback = role === 'admin' ? '/dashboard/users' : '/dashboard'
      router.push(next && next.startsWith('/') ? next : fallback)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white/80 p-8 shadow-glass backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-800">Sign in</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
            required
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
            required
          />
          {error ? <p className="text-sm text-red-650 font-semibold">{error}</p> : null}
          <button
            disabled={submitting}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 py-2.5 font-bold text-white shadow-md shadow-indigo-600/10 hover:opacity-95 hover:shadow-indigo-600/20 disabled:opacity-60 transition"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-500 font-medium">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-bold text-indigo-650 hover:text-indigo-500 transition">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
