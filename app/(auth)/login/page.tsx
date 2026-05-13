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
    <div className="min-h-screen flex items-center justify-center p-6 main-bg">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-4">Sign in</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button disabled={submitting} className="w-full bg-indigo-600 text-white py-2 rounded disabled:opacity-60">
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm">Don&apos;t have an account? <Link href="/register" className="text-indigo-600">Register</Link></p>
      </div>
    </div>
  )
}
