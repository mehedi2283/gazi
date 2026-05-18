"use client"
import React from 'react'
import { chartTooltipProps } from '@/lib/chart-theme'

type PayloadItem = {
  name?: string
  value?: any
  color?: string
  payload?: any
}

export default function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: PayloadItem[]; label?: string }) {
  if (!active || !payload || !payload.length) return null

  const style = chartTooltipProps

  return (
    <div style={style.contentStyle} className="p-3">
      {label ? <div style={style.labelStyle as any} className="mb-2">{label}</div> : null}
      <div>
        {payload.map((item, idx) => {
          const color = item.color || item.payload?.stroke || item.payload?.fill || '#cbd5e1'
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 12, height: 12, background: color, borderRadius: 3, flex: 'none' }} />
              <div style={{ color: (style.itemStyle as any).color }}>{item.name}: <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.value}</span></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
