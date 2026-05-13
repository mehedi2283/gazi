'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password
        })
      })
      const json = await response.json()

      if (!response.ok || json.error) {
        throw new Error(json.error?.message || json.error || 'Unable to create account')
      }

      router.push('/login?registered=1')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Unable to create account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 main-bg">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-4">Create account</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            placeholder="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
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
            minLength={6}
            required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button disabled={submitting} className="w-full bg-indigo-600 text-white py-2 rounded disabled:opacity-60">
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-sm">Already have an account? <Link href="/login" className="text-indigo-600">Sign in</Link></p>
      </div>
    </div>
  )
}
