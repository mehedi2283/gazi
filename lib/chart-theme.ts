/** Recharts styling for light/aurora dashboard surfaces */
export const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    borderRadius: '12px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
  },
  labelStyle: { color: '#1e293b', fontWeight: 600 },
  itemStyle: { color: '#64748b' },
} as const

export const chartAxisTick = { fill: '#64748b', fontSize: 12 }
export const chartAxisLine = { stroke: '#e2e8f0' }
export const chartGridStroke = '#f1f5f9'
