'use client'

import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

type GlassCardProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode
  hover?: boolean
}

const base =
  'rounded-xl border border-slate-200 bg-white/70 shadow-glass backdrop-blur-xl'

export function GlassCard({ children, className = '', hover = true, ...props }: GlassCardProps) {
  if (!hover) {
    return <div className={`${base} ${className}`}>{children}</div>
  }

  return (
    <motion.div
      className={`${base} ${className}`}
      whileHover={{ y: -2, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
