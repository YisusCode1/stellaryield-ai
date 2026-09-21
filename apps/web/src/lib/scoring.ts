import type { Market, Risk } from '../data/mock'

export type Goal = 'yield' | 'liquidity' | 'safe'

export const goalLabels: Record<Goal, string> = { yield: 'rendimiento', liquidity: 'liquidez', safe: 'bajo riesgo' }
export const riskLabels: Record<Risk, string> = { bajo: 'Bajo riesgo', medio: 'Riesgo medio', alto: 'Riesgo alto' }

export interface Factor { key: string; label: string; score: number; detail: string }
export interface Explanation { total: number; factors: Factor[] }
export interface RankedMarket { market: Market; explanation: Explanation }

const RISK_SCORE: Record<Risk, number> = { bajo: 95, medio: 60, alto: 25 }

// Peso de cada factor según el objetivo del usuario
const WEIGHTS: Record<Goal, Record<string, number>> = {
  yield: { apy: 0.5, risk: 0.2, liquidity: 0.15, util: 0.15 },
  liquidity: { liquidity: 0.5, util: 0.2, risk: 0.15, apy: 0.15 },
  safe: { risk: 0.5, util: 0.2, liquidity: 0.2, apy: 0.1 },
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export function explain(m: Market, goal: Goal): Explanation {
  const factors: Factor[] = [
    { key: 'apy', label: 'Rendimiento', score: clamp((m.supplyApy / 6) * 100), detail: `${m.supplyApy.toFixed(2)}% anual` },
    { key: 'liquidity', label: 'Liquidez', score: clamp((m.liquidityUsd / 1_200_000) * 100), detail: `${m.liquidity} disponibles` },
    { key: 'risk', label: 'Seguridad', score: RISK_SCORE[m.risk], detail: riskLabels[m.risk] },
    { key: 'util', label: 'Uso saludable', score: clamp(100 - Math.abs(m.utilization - 60) * 2), detail: `${m.utilization}% utilizado` },
  ]
  const w = WEIGHTS[goal]
  const total = clamp(factors.reduce((sum, f) => sum + f.score * w[f.key], 0))
  return { total, factors }

}

export function rankMarkets(markets: Market[], goal: Goal): RankedMarket[] {
  return markets
    .map((market) => ({ market, explanation: explain(market, goal) }))
    .sort((a, b) => b.explanation.total - a.explanation.total)
}