const styles: Record<string, { bg: string; fg: string; label: string }> = {
  USDC: { bg: '#2775ca', fg: '#fff', label: '$' },
  XLM: { bg: '#0b0e22', fg: '#fff', label: '✶' },
  wBTC: { bg: '#f7931a', fg: '#fff', label: '₿' },
  AUSD: { bg: '#5b3df5', fg: '#fff', label: 'A' },
}

export default function TokenIcon({ symbol, size = 34 }: { symbol: string; size?: number }) {
  const s = styles[symbol] ?? { bg: '#334', fg: '#fff', label: symbol[0] }
  return (
    <span className="token-icon" style={{ width: size, height: size, background: s.bg, color: s.fg, fontSize: size * 0.5 }}>
      {s.label}
    </span>
  )
}
