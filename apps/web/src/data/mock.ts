// Datos de ejemplo tomados del diseño. Reemplázalos por datos reales (API / XOXNO SDK).

export type Risk = 'bajo' | 'medio' | 'alto'

export interface Market {
  symbol: string
  network: string
  supplyApy: number
  borrowApy: number
  utilization: number
  liquidity: string
  liquidityUsd: number
  risk: Risk
}

export const markets: Market[] = [
  { symbol: 'USDC', network: 'Stellar', supplyApy: 5.42, borrowApy: 8.76, utilization: 62, liquidity: '$1.2M', liquidityUsd: 1_200_000, risk: 'bajo' },
  { symbol: 'XLM', network: 'Stellar', supplyApy: 3.21, borrowApy: 5.67, utilization: 48, liquidity: '$850K', liquidityUsd: 850_000, risk: 'medio' },
  { symbol: 'wBTC', network: 'Stellar', supplyApy: 1.87, borrowApy: 3.12, utilization: 38, liquidity: '$420K', liquidityUsd: 420_000, risk: 'alto' },
  { symbol: 'AUSD', network: 'Stellar', supplyApy: 4.12, borrowApy: 7.34, utilization: 71, liquidity: '$310K', liquidityUsd: 310_000, risk: 'medio' },
]

export const wallet = {
  address: 'GAB2QX7NPLMWCV3YTRD5HJK9ELFZ4A6S8UGBO2IN1WKRD7Q5ZJ3MP7K3F',
  network: 'Stellar Testnet',
  totalUsd: 152.48,
  totalUsdc: 728.32,
  balances: [
    { symbol: 'USDC', amount: 728.32, usd: 728.32 },
    { symbol: 'XLM', amount: 12.45, usd: 24.16 },
  ],
}

export const tokenPriceUsd: Record<string, number> = { USDC: 1, XLM: 1.94, wBTC: 65000, AUSD: 1 }

export const positions = [
  { symbol: 'USDC', type: 'Supply en XOXNO', amount: 500, usd: 500, apy: 5.42, gain: 12.34 },
  { symbol: 'XLM', type: 'Supply en XOXNO', amount: 12.45, usd: 24.16, apy: 3.21, gain: 0.76 },
]

export const portfolio = {
  changePct: 2.34,
  series: [118, 121, 120, 126, 124, 131, 129, 135, 133, 138, 137, 142, 140, 144, 143, 148, 146, 150, 149, 152.48],
  yearlyEstimateUsd: 42.16,
  yearlyApy: 8.74,
}

export const activity = [
  { id: 1, type: 'Supply', symbol: 'USDC', amount: 500, date: '18 sep 2026', status: 'Confirmada' },
  { id: 2, type: 'Supply', symbol: 'XLM', amount: 12.45, date: '15 sep 2026', status: 'Confirmada' },
  { id: 3, type: 'Faucet', symbol: 'USDC', amount: 250, date: '14 sep 2026', status: 'Confirmada' },
]

export const fmtPct = (value?: number): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0.00%'
  }
  return `${value.toFixed(2)}%`
}

export const fmtUsd = (n: number) =>
  `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fmtNum = (n: number) =>
  (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtAddr = (a: string) => (a && a.length > 12 ? `${a.slice(0, 4)}...${a.slice(-4)}` : a ?? '')