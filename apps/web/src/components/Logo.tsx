export function StarMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="sm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b9bff" />
          <stop offset="1" stopColor="#4b3cff" />
        </linearGradient>
      </defs>
      <path d="M16 1.5C17 10 21.5 14.5 30.5 16 21.5 17.5 17 22 16 30.5 15 22 10.5 17.5 1.5 16 10.5 14.5 15 10 16 1.5Z" fill="url(#sm)" />
    </svg>
  )
}

export function Brand() {
  return (
    <div className="brand">
      <StarMark />
      <div>
        <div className="brand-name">StellarYield <span>AI</span></div>
        <div className="brand-sub">DeFi inteligente en Stellar</div>
      </div>
    </div>
  )
}

export function PoweredBy() {
  return (
    <div className="powered">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="8" fill="none" stroke="#5b6cff" strokeWidth="2" />
        <path d="M9 9l14 14M23 9 9 23" stroke="#e7e9ff" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div>
        <small>Powered by</small>
        <strong>XOXNO</strong>
        <small>Stellar Lending</small>
      </div>
    </div>
  )
}
