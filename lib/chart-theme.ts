/** Recharts styling for dark dashboard surfaces */
export const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(12, 12, 12, 0.92)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
  },
  labelStyle: { color: '#fafafa', fontWeight: 600 },
  itemStyle: { color: '#a1a1aa' },
} as const

export const chartAxisTick = { fill: '#a1a1aa', fontSize: 12 }
export const chartAxisLine = { stroke: '#3f3f46' }
export const chartGridStroke = '#27272a'
