export default function Sparkline({ data, width = 420, height = 130 }: { data: number[]; width?: number; height?: number }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const pad = 6
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2)
    return [x, y] as const
  })
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width} ${height} L0 ${height} Z`
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Evolución del balance">
      <defs>
        <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b6cff" stopOpacity=".45" />
          <stop offset="1" stopColor="#5b6cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sp)" />
      <path d={line} fill="none" stroke="#7d8bff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
