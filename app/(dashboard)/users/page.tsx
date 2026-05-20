'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users, UserPlus, Shield, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../../components/ui/Modal'
import { GlassCard } from '@/components/ui/GlassCard'
import useCurrentUser from '../../../hooks/useCurrentUser'

type TeamUser = {
  id: string
  full_name: string | null
  role: string | null
  created_at: string | null
}

export default function UsersPage() {
  const { user, isAdmin, isLoading: userLoading } = useCurrentUser()
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState('')
  const [deleteModalFor, setDeleteModalFor] = useState<TeamUser | null>(null)
  const [deletingFromModal, setDeletingFromModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch('/api/users')
        const json = await response.json()

        if (!response.ok || json.error) {
          throw new Error(json.error?.message || json.error || 'Failed to load users')
        }

        setUsers(Array.isArray(json.data) ? json.data : [])
      } catch (err: any) {
        setError(err?.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setCreating(true)

    try {
      const response = await fetch('/api/users', {
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
        throw new Error(json.error?.message || json.error || 'Unable to create user')
      }

      toast.success('User created')
      setUsers((current) => [json.data, ...current])
      setFullName('')
      setEmail('')
      setPassword('')
    } catch (err: any) {
      setError(err?.message || 'Unable to create user')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteUser(targetUser: TeamUser) {
    if (!isAdmin) return

    setDeletingUserId(targetUser.id)
    setError('')

    try {
      const response = await fetch(`/api/users?id=${encodeURIComponent(targetUser.id)}`, {
        method: 'DELETE'
      })
      const json = await response.json()

      if (!response.ok || json.error) {
        throw new Error(json.error?.message || json.error || 'Unable to delete user')
      }

      toast.success('User deleted')
      setUsers((current) => current.filter((item) => item.id !== targetUser.id))
    } catch (err: any) {
      setError(err?.message || 'Unable to delete user')
    } finally {
      setDeletingUserId('')
    }
  }

  const visibleUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return [...users]
      .sort((left, right) => {
        const leftIsAdmin = left.role === 'admin' ? 1 : 0
        const rightIsAdmin = right.role === 'admin' ? 1 : 0

        if (leftIsAdmin !== rightIsAdmin) {
          return rightIsAdmin - leftIsAdmin
        }

        const leftName = (left.full_name || '').toLowerCase()
        const rightName = (right.full_name || '').toLowerCase()
        return leftName.localeCompare(rightName)
      })
      .filter((item) => {
        if (!query) return true
        const name = (item.full_name || '').toLowerCase()
        const role = (item.role || 'user').toLowerCase()
        return name.includes(query) || role.includes(query) || item.id.toLowerCase().includes(query)
      })
  }, [users, searchQuery])

  if (userLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600 shadow-glass">Loading...</div>
  }

  if (!isAdmin) {
    return (
      <GlassCard className="p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Admin access required</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              User management is only available to the admin account. Contact your admin if you need access.
            </p>
          </div>
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white/70 px-5 py-4 shadow-glass backdrop-blur-xl">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Administration</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Users</h1>
          <p className="text-sm text-slate-500">Create team members, review roles, and keep access limited.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className="p-6" hover={false}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20">
              <Users className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Team members</h2>
              <p className="text-sm text-slate-500">{users.length} user{users.length === 1 ? '' : 's'} in this workspace</p>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" aria-hidden />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search users by name, role, or id"
                className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : visibleUsers.length ? (
            <div className="space-y-3">
              {visibleUsers.map((item) => {
                const isAdminUser = item.role === 'admin'
                const canDelete = isAdmin && item.id !== user?.id
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{item.full_name || 'Unnamed user'}</div>
                      <div className="text-xs text-slate-500">{item.id === user?.id ? 'You' : 'Member'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isAdminUser ? 'bg-indigo-500/10 text-indigo-700' : 'bg-slate-500/10 text-slate-600'}`}>
                        {item.role || 'user'}
                      </span>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => setDeleteModalFor(item)}
                          disabled={deletingUserId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          {deletingUserId === item.id ? 'Deleting...' : 'Delete'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No users found.</p>
          )}
        </GlassCard>

        <GlassCard className="p-6" hover={false}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20">
              <UserPlus className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Add user</h2>
              <p className="text-sm text-slate-500">Create a limited-access team user.</p>
            </div>
          </div>

          <form className="space-y-3" onSubmit={handleCreateUser}>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm"
              required
            />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              type="email"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm"
              required
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              minLength={6}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm"
              required
            />
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {creating ? 'Creating...' : 'Create user'}
            </button>
          </form>
        </GlassCard>
      </div>

      <Modal
        open={Boolean(deleteModalFor)}
        title="Delete user"
        onClose={() => !deletingFromModal && setDeleteModalFor(null)}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Delete <strong className="text-slate-800">{deleteModalFor?.full_name || 'this user'}</strong>? This will remove the user account and profile, and cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={deletingFromModal}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setDeleteModalFor(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingFromModal}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              onClick={async () => {
                if (!deleteModalFor) return
                const target = deleteModalFor
                setDeletingFromModal(true)
                try {
                  await handleDeleteUser(target)
                  setDeleteModalFor(null)
                } catch (err) {
                  // error already set and shown
                } finally {
                  setDeletingFromModal(false)
                }
              }}
            >
              {deletingFromModal ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
