import type {
  AdvisorInput,
  AdvisorRecommendation,
  Market,
  RiskLabel,
  RiskProfile,
} from '../domain/market.js'

const MARKET_MAX_AGE_MS = 5 * 60 * 1_000

const ADVISOR_DISCLAIMER =
  'Esto es una recomendación informativa basada en datos de mercado; no es asesoría financiera. Revisa los datos y firma sólo si estás de acuerdo.'

interface RiskPolicy {
  maxUtilizationPercent: number
  minimumLiquidityMultiplier: number
  label: RiskLabel
}

const RISK_POLICIES: Readonly<Record<RiskProfile, RiskPolicy>> = {
  conservative: {
    maxUtilizationPercent: 70,
    minimumLiquidityMultiplier: 5,
    label: 'Bajo',
  },
  moderate: {
    maxUtilizationPercent: 85,
    minimumLiquidityMultiplier: 3,
    label: 'Moderado',
  },
  aggressive: {
    maxUtilizationPercent: 92,
    minimumLiquidityMultiplier: 2,
    label: 'Alto',
  },
}

interface Candidate {
  market: Market
  liquidityCoverage: number
}

export interface RecommendOptions {
  now?: Date
  expectedNetwork: Market['network']
}

const formatNumber = (value: number, maximumFractionDigits = 2): string =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)

const isFresh = (updatedAt: string, now: Date): boolean => {
  const timestamp = Date.parse(updatedAt)
  return Number.isFinite(timestamp) && timestamp <= now.getTime() && now.getTime() - timestamp <= MARKET_MAX_AGE_MS
}

const isMarketWellFormed = (market: Market): boolean => {
  const numbers = [
    market.supplyApyPercent,
    market.borrowApyPercent,
    market.availableLiquidityUsd,
    market.totalSupplyUsd,
    market.totalBorrowUsd,
    market.utilizationPercent,
  ]

  return (
    typeof market.asset === 'string' &&
    market.asset.length > 0 &&
    numbers.every((value) => Number.isFinite(value) && value >= 0) &&
    market.utilizationPercent <= 100
  )
}

const eligibleCandidate = (
  market: Market,
  input: AdvisorInput,
  policy: RiskPolicy,
  now: Date,
  expectedNetwork: Market['network'],
): Candidate | undefined => {
  if (!isMarketWellFormed(market) || market.network !== expectedNetwork || !isFresh(market.updatedAt, now)) {
    return undefined
  }

  if (input.preferredAsset !== undefined && market.asset.toUpperCase() !== input.preferredAsset) {
    return undefined
  }

  if (
    market.supplyApyPercent <= 0 ||
    market.utilizationPercent > policy.maxUtilizationPercent ||
    market.availableLiquidityUsd < input.amountUsd * policy.minimumLiquidityMultiplier
  ) {
    return undefined
  }

  const liquidityCoverage = market.availableLiquidityUsd / input.amountUsd
  return { market, liquidityCoverage }
}

const sortCandidates = (left: Candidate, right: Candidate): number => {
  // Order is lexicographic, rather than a weighted score: a higher APY is
  // always preferred once both markets pass the profile's safety thresholds.
  if (right.market.supplyApyPercent !== left.market.supplyApyPercent) {
    return right.market.supplyApyPercent - left.market.supplyApyPercent
  }
  if (right.market.availableLiquidityUsd !== left.market.availableLiquidityUsd) {
    return right.market.availableLiquidityUsd - left.market.availableLiquidityUsd
  }
  if (left.market.utilizationPercent !== right.market.utilizationPercent) {
    return left.market.utilizationPercent - right.market.utilizationPercent
  }
  return left.market.asset.localeCompare(right.market.asset)
}

const noRecommendation = (
  input: AdvisorInput,
  policy: RiskPolicy,
  now: Date,
): AdvisorRecommendation => ({
  status: 'not_recommended',
  risk: policy.label,
  confidence: 'low',
  reasons: [
    input.preferredAsset === undefined
      ? 'Ningún mercado disponible cumple los límites de liquidez, utilización y actualidad de datos para tu perfil.'
      : `No hay un mercado de ${input.preferredAsset} que cumpla los límites de liquidez, utilización y actualidad de datos para tu perfil.`,
  ],
  cautions: [
    'No recomendamos operar hasta contar con un mercado que cumpla estos límites.',
    'Las tasas y la liquidez pueden cambiar antes de que confirmes una operación.',
  ],
  generatedAt: now.toISOString(),
  disclaimer: ADVISOR_DISCLAIMER,
})

export const recommendSupply = (
  markets: readonly Market[],
  input: AdvisorInput,
  options: RecommendOptions,
): AdvisorRecommendation => {
  const now = options.now ?? new Date()
  const policy = RISK_POLICIES[input.riskProfile]
  const candidates = markets
    .map((market) => eligibleCandidate(market, input, policy, now, options.expectedNetwork))
    .filter((candidate): candidate is Candidate => candidate !== undefined)
    .sort(sortCandidates)

  const selected = candidates[0]
  if (selected === undefined) return noRecommendation(input, policy, now)

  const { market, liquidityCoverage } = selected
  const confidence =
    liquidityCoverage >= policy.minimumLiquidityMultiplier * 2 &&
    market.utilizationPercent <= policy.maxUtilizationPercent - 15
      ? 'high'
      : 'medium'

  return {
    status: 'recommended',
    action: 'supply',
    asset: market.asset,
    amountUsd: input.amountUsd,
    currentSupplyApyPercent: market.supplyApyPercent,
    risk: policy.label,
    confidence,
    reasons: [
      `El APY de supply actual de ${market.asset} es ${formatNumber(market.supplyApyPercent)}%.`,
      `La liquidez disponible de $${formatNumber(market.availableLiquidityUsd)} cubre ${formatNumber(liquidityCoverage, 1)}× el monto solicitado.`,
      `La utilización actual es ${formatNumber(market.utilizationPercent)}%, dentro del límite de ${formatNumber(policy.maxUtilizationPercent)}% para tu perfil.`,
    ],
    cautions: [
      'El APY es variable y puede cambiar en cualquier momento.',
      'Revisa el activo, monto y red en tu wallet antes de firmar.',
    ],
    marketUpdatedAt: market.updatedAt,
    generatedAt: now.toISOString(),
    disclaimer: ADVISOR_DISCLAIMER,
  }
}

export { MARKET_MAX_AGE_MS, RISK_POLICIES }
