"use client"

import React from 'react'

export default function Modal({ open, title, children, onClose }: {
  open: boolean
  title?: string
  children: React.ReactNode
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-white/[0.1] bg-zinc-950/90 p-6 shadow-glass backdrop-blur-2xl">
        {title ? <h3 className="mb-4 text-lg font-semibold text-zinc-50">{title}</h3> : null}
        <div className="text-zinc-300">{children}</div>
      </div>
    </div>
  )
}
