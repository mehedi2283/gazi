'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, LockKeyhole } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'checking' | 'request' | 'reset'>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function attachSession(accessToken: string, refreshToken: string, expiresIn?: number) {
      const syncResponse = await fetch('/api/auth/sync-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          refreshToken,
          expiresIn
        })
      })

      if (!syncResponse.ok) {
        throw new Error('We could not attach your recovery session. Please try the link again.')
      }
    }

    async function bootstrap() {
      const searchParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const code = searchParams.get('code') || hashParams.get('code') || ''
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash') || ''
      const accessToken = hashParams.get('access_token') || ''
      const refreshToken = hashParams.get('refresh_token') || ''
      const expiresIn = Number(hashParams.get('expires_in') || searchParams.get('expires_in') || 0) || undefined
      const recoveryError =
        searchParams.get('error') || hashParams.get('error') || ''
      const errorDescription =
        searchParams.get('error_description') || hashParams.get('error_description') || ''

      if (recoveryError) {
        if (!cancelled) {
          setStatus(errorDescription || 'This recovery link is invalid or expired. Request a new one below.')
          setMode('request')
        }
        return
      }

      if (!code) {
        try {
          if (tokenHash) {
            const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })

            if (error || !data.session) {
              throw error || new Error('That recovery link is invalid or expired.')
            }

            await attachSession(data.session.access_token, data.session.refresh_token, data.session.expires_in)
            if (!cancelled) {
              setStatus('Recovery link accepted. Choose a new password below.')
              setMode('reset')
            }
            return
          }

          if (accessToken && refreshToken) {
            await attachSession(accessToken, refreshToken, expiresIn)
            if (!cancelled) {
              setStatus('Recovery link accepted. Choose a new password below.')
              setMode('reset')
            }
            return
          }
        } catch (error: any) {
          if (!cancelled) {
            setStatus(error?.message || 'That recovery link is invalid or expired.')
            setMode('request')
          }
          return
        }

        if (!cancelled) {
          setMode('request')
        }
        return
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (cancelled) return

      if (error || !data.session) {
        setStatus(error?.message || 'That recovery link is invalid or expired.')
        setMode('request')
        return
      }

      await attachSession(data.session.access_token, data.session.refresh_token, data.session.expires_in)

      setStatus('Recovery link accepted. Choose a new password below.')
      setMode('reset')
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleRequestLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setStatus('')

    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })

      if (error) {
        throw error
      }

      setStatus('If that email exists, a reset link has been sent.')
    } catch (error: any) {
      setStatus(error?.message || 'Unable to send reset link')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password.length < 6) {
      setStatus('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setStatus('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setStatus('')

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        throw error
      }

      setStatus('Password updated. Redirecting to the dashboard...')
      router.replace('/dashboard')
      router.refresh()
    } catch (error: any) {
      setStatus(error?.message || 'Unable to update password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white/80 p-8 shadow-glass backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-800">Reset password</h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-500">
          Request a reset link or finish creating a new password from the recovery email.
        </p>

        {status ? <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">{status}</p> : null}

        {mode === 'checking' ? (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking recovery link...
          </div>
        ) : null}

        {mode === 'request' ? (
          <div className="space-y-6">
            <form className="space-y-4" onSubmit={handleRequestLink}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  placeholder="Email address"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pl-10 text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                  required
                />
              </div>
              <button
                disabled={submitting}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 py-2.5 font-bold text-white shadow-md shadow-indigo-600/10 hover:opacity-95 hover:shadow-indigo-600/20 disabled:opacity-60 transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          </div>
        ) : null}

        {mode === 'reset' ? (
          <form className="space-y-4" onSubmit={handleSetPassword}>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                placeholder="New password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pl-10 text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
                minLength={6}
                required
              />
            </div>
            <input
              placeholder="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm font-medium"
              minLength={6}
              required
            />
            <button
              disabled={submitting}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 py-2.5 font-bold text-white shadow-md shadow-indigo-600/10 hover:opacity-95 hover:shadow-indigo-600/20 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                'Update password'
              )}
            </button>
          </form>
        ) : null}

        <p className="mt-5 text-sm text-slate-500 font-medium">
          Back to{' '}
          <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-500 transition">
            sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
