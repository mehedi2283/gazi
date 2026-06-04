'use client'

import React, { useEffect, useState } from 'react'
import { Loader2, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { GlassCard } from '@/components/ui/GlassCard'
import useCurrentUser from '@/hooks/useCurrentUser'
import supabase from '@/lib/supabase/client'

export default function SettingsPage() {
  const { user } = useCurrentUser()
  const [sending, setSending] = useState(false)

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const targetEmail = user?.email?.trim() || ''

    if (!targetEmail) {
      toast.error('Unable to find your account email')
      return
    }

    setSending(true)
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo })

      if (error) {
        throw error
      }

      toast.success('Reset link sent. Check your inbox.')
    } catch (error: any) {
      toast.error(error?.message || 'Unable to send reset link')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <GlassCard hover={false} className="overflow-hidden border border-sky-200/60 bg-white/85 p-0 shadow-[0_18px_60px_rgba(37,99,235,0.10)]">
        <div className="border-b border-slate-200/70 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-6 py-6 sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/20">
              <KeyRound className="h-6 w-6 text-white" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-2xl font-bold tracking-tight text-slate-800">Reset password</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                Send a reset email to your signed-in account address. The email opens a recovery page where you can
                set a new password.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Account email</div>
            <div className="mt-2 text-base font-semibold text-slate-800">{user?.email || 'No email found'}</div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-slate-500">
              We only use the email tied to your signed-in account. No extra steps.
            </p>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {sending ? 'Sending...' : 'Send reset link'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}
