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
      router.push(next && next.startsWith('/') ? next : '/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-glass backdrop-blur-xl">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-zinc-50">Sign in</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/30"
            required
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/30"
            required
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            disabled={submitting}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/25 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-blue-400 hover:text-blue-300">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
