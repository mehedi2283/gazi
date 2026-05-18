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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-slate-100 bg-white p-6 shadow-glass">
        {title ? <h3 className="mb-4 text-lg font-semibold text-slate-800">{title}</h3> : null}
        <div>{children}</div>
      </div>
    </div>
  )
}
