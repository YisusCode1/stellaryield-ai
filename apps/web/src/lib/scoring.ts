import type { Risk } from './market'

export type Goal = 'yield' | 'liquidity' | 'safe'

export const goalLabels: Record<Goal, string> = { yield: 'rendimiento', liquidity: 'liquidez', safe: 'bajo riesgo' }
export const riskLabels: Record<Risk, string> = { bajo: 'Bajo riesgo', medio: 'Riesgo medio', alto: 'Riesgo alto' }

export interface Factor { key: string; label: string; score: number; detail: string }
export interface Explanation { total: number; factors: Factor[] }

const RISK_SCORE: Record<Risk, number> = { bajo: 95, medio: 60, alto: 25 }

// Peso de cada factor según el objetivo del usuario
const WEIGHTS: Record<Goal, Record<string, number>> = {
  yield: { apy: 0.5, risk: 0.2, liquidity: 0.15, util: 0.15 },
  liquidity: { liquidity: 0.5, util: 0.2, risk: 0.15, apy: 0.15 },
  safe: { risk: 0.5, util: 0.2, liquidity: 0.2, apy: 0.1 },
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n || 0)))

export function explain(m: any, goal: Goal = 'yield'): Explanation {
  // 1. Extraer y normalizar propiedades numéricas de forma segura
  const supplyApy = Number(m?.supplyApy ?? m?.supply_apy ?? 0)
  const liquidityUsd = Number(m?.liquidityUsd ?? m?.liquidity_usd ?? 0)
  const utilization = Number(m?.utilization ?? 0)
  const liquidityText = m?.liquidity ?? '0'
  const risk: Risk = (m?.risk && RISK_SCORE[m.risk as Risk]) ? (m.risk as Risk) : 'bajo'

  // 2. Factores con formato seguro (.toFixed(2) garantizado)
  const factors: Factor[] = [
    { 
      key: 'apy', 
      label: 'Rendimiento', 
      score: clamp((supplyApy / 6) * 100), 
      detail: `${supplyApy.toFixed(2)}% anual` 
    },
    { 
      key: 'liquidity', 
      label: 'Liquidez', 
      score: clamp((liquidityUsd / 1_200_000) * 100), 
      detail: `${liquidityText} disponibles` 
    },
    { 
      key: 'risk', 
      label: 'Seguridad', 
      score: RISK_SCORE[risk], 
      detail: riskLabels[risk] 
    },
    { 
      key: 'util', 
      label: 'Uso saludable', 
      score: clamp(100 - Math.abs(utilization - 60) * 2), 
      detail: `${utilization}% utilizado` 
    },
  ]

  const w = WEIGHTS[goal] ?? WEIGHTS.yield
  const total = clamp(factors.reduce((sum, f) => sum + f.score * (w[f.key] ?? 0), 0))
  
  return { total, factors }
}
