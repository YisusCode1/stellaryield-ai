export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'
export type AdvisorStatus = 'recommended' | 'not_recommended'

export interface AdvisorRequest {
  amountUsd: number
  riskProfile: RiskProfile
  preferredAsset?: string
}

export interface AdvisorRecommendation {
  status: AdvisorStatus
  action?: 'supply'
  asset?: string
  amountUsd?: number
  currentSupplyApyPercent?: number
  risk: 'Bajo' | 'Moderado' | 'Alto'
  confidence: 'high' | 'medium' | 'low'
  reasons: readonly string[]
  cautions: readonly string[]
  marketUpdatedAt?: string
  generatedAt: string
  disclaimer: string
}

export class AdvisorApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'AdvisorApiError'
    this.status = status
    this.code = code
  }
}

interface ApiErrorPayload {
  error?: { code?: unknown; message?: unknown }
}

const configuredBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const apiBaseUrl = (): URL => {
  const url = new URL(configuredBaseUrl)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_API_URL debe usar HTTP o HTTPS.')
  }
  return url
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asStringArray = (value: unknown): readonly string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined

const parseRecommendation = (payload: unknown): AdvisorRecommendation => {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.recommendation)) {
    throw new AdvisorApiError(502, 'INVALID_API_RESPONSE', 'La respuesta del Advisor no tiene el formato esperado.')
  }
  const recommendation = payload.data.recommendation
  const status: AdvisorStatus | undefined =
    recommendation.status === 'recommended' || recommendation.status === 'not_recommended'
      ? recommendation.status
      : undefined
  const risk: AdvisorRecommendation['risk'] | undefined =
    recommendation.risk === 'Bajo' || recommendation.risk === 'Moderado' || recommendation.risk === 'Alto'
      ? recommendation.risk
      : undefined
  const confidence: AdvisorRecommendation['confidence'] | undefined =
    recommendation.confidence === 'high' || recommendation.confidence === 'medium' || recommendation.confidence === 'low'
      ? recommendation.confidence
      : undefined
  const reasons = asStringArray(recommendation.reasons)
  const cautions = asStringArray(recommendation.cautions)

  if (status === undefined || risk === undefined || confidence === undefined || reasons === undefined || cautions === undefined || typeof recommendation.disclaimer !== 'string' || typeof recommendation.generatedAt !== 'string') {
    throw new AdvisorApiError(502, 'INVALID_API_RESPONSE', 'La respuesta del Advisor no tiene el formato esperado.')
  }

  const optionalString = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined
  const optionalNumber = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : undefined
  const action = recommendation.action === 'supply' ? 'supply' : undefined
  const asset = optionalString(recommendation.asset)
  const amountUsd = optionalNumber(recommendation.amountUsd)
  const currentSupplyApyPercent = optionalNumber(recommendation.currentSupplyApyPercent)
  const marketUpdatedAt = optionalString(recommendation.marketUpdatedAt)

  return {
    status,
    ...(action === undefined ? {} : { action }),
    ...(asset === undefined ? {} : { asset }),
    ...(amountUsd === undefined ? {} : { amountUsd }),
    ...(currentSupplyApyPercent === undefined ? {} : { currentSupplyApyPercent }),
    risk,
    confidence,
    reasons,
    cautions,
    ...(marketUpdatedAt === undefined ? {} : { marketUpdatedAt }),
    generatedAt: recommendation.generatedAt,
    disclaimer: recommendation.disclaimer,
  }
}

export const requestAdvisorRecommendation = async (
  request: AdvisorRequest,
  signal?: AbortSignal,
): Promise<AdvisorRecommendation> => {
  const url = new URL('/api/v1/advisor/recommendations', apiBaseUrl())
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })

  const payload: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const errorPayload = isRecord(payload) ? payload as ApiErrorPayload : undefined
    const code = typeof errorPayload?.error?.code === 'string' ? errorPayload.error.code : 'REQUEST_FAILED'
    const message = typeof errorPayload?.error?.message === 'string'
      ? errorPayload.error.message
      : 'No fue posible obtener una recomendación. Inténtalo nuevamente.'
    throw new AdvisorApiError(response.status, code, message)
  }
  return parseRecommendation(payload)
}
