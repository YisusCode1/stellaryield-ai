export const RISK_PROFILES = ['conservative', 'moderate', 'aggressive'] as const
export type RiskProfile = (typeof RISK_PROFILES)[number]

export const NETWORKS = ['testnet', 'mainnet'] as const
export type Network = (typeof NETWORKS)[number]

export interface Market {
  asset: string
  symbol: string // <-- AGREGAR: Alias/propiedad de símbolo (ej: 'USDC')
  supplyApyPercent: number
  supplyApy: number // <-- AGREGAR: Alias para compatibilidad con frontend
  borrowApyPercent: number
  borrowApy: number // <-- AGREGAR: Alias para compatibilidad
  availableLiquidityUsd: number
  totalSupplyUsd: number
  totalBorrowUsd: number
  utilizationPercent: number
  utilization: number // <-- AGREGAR: Alias para compatibilidad
  network: Network
  updatedAt: string
}

export interface MarketSnapshot {
  markets: readonly Market[]
  fetchedAt: string
}

export interface AdvisorInput {
  amountUsd: number
  riskProfile: RiskProfile
  preferredAsset?: string
}

export type RecommendationStatus = 'recommended' | 'not_recommended'
export type RecommendationConfidence = 'high' | 'medium' | 'low'
export type RiskLabel = 'Bajo' | 'Moderado' | 'Alto'

export interface AdvisorRecommendation {
  status: RecommendationStatus
  action?: 'supply'
  asset?: string
  amountUsd?: number
  currentSupplyApyPercent?: number
  risk: RiskLabel
  confidence: RecommendationConfidence
  reasons: readonly string[]
  cautions: readonly string[]
  marketUpdatedAt?: string
  generatedAt: string
  disclaimer: string
}
