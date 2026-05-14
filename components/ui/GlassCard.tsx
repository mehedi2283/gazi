'use client'

import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

type GlassCardProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode
  hover?: boolean
}

const base =
  'rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl'

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
