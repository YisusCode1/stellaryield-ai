export const fmtPct = (value?: number): string =>
  Number.isFinite(value) ? `${value!.toFixed(2)}%` : '—'

export const fmtUsd = (value?: number): string =>
  Number.isFinite(value)
    ? `$${value!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'

export const fmtNum = (value?: number): string =>
  Number.isFinite(value)
    ? value!.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

export const fmtAddr = (address: string) =>
  address && address.length > 12 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address ?? ''
