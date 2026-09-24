import { ValidationError } from '../domain/errors.js'
import { RISK_PROFILES, type AdvisorInput, type RiskProfile } from '../domain/market.js'

const REQUEST_KEYS = new Set(['amountUsd', 'riskProfile', 'preferredAsset'])
const MAX_AMOUNT_USD = 1_000_000_000
const ASSET_PATTERN = /^[A-Za-z0-9]{1,12}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const parseAdvisorRequest = (body: unknown): AdvisorInput => {
  if (!isRecord(body)) throw new ValidationError('El cuerpo debe ser un objeto JSON.')

  for (const key of Object.keys(body)) {
    if (!REQUEST_KEYS.has(key)) {
      throw new ValidationError(`El campo "${key}" no está permitido.`)
    }
  }

  if (typeof body.amountUsd !== 'number' || !Number.isFinite(body.amountUsd)) {
    throw new ValidationError('amountUsd debe ser un número finito.')
  }
  if (body.amountUsd <= 0 || body.amountUsd > MAX_AMOUNT_USD) {
    throw new ValidationError(`amountUsd debe ser mayor que 0 y no superar ${MAX_AMOUNT_USD}.`)
  }

  if (typeof body.riskProfile !== 'string' || !RISK_PROFILES.includes(body.riskProfile as RiskProfile)) {
    throw new ValidationError('riskProfile debe ser conservative, moderate o aggressive.')
  }

  let preferredAsset: string | undefined
  if (body.preferredAsset !== undefined) {
    if (typeof body.preferredAsset !== 'string' || !ASSET_PATTERN.test(body.preferredAsset)) {
      throw new ValidationError('preferredAsset debe tener entre 1 y 12 caracteres alfanuméricos.')
    }
    preferredAsset = body.preferredAsset.toUpperCase()
  }

  return {
    amountUsd: body.amountUsd,
    riskProfile: body.riskProfile as RiskProfile,
    ...(preferredAsset === undefined ? {} : { preferredAsset }),
  }
}

// Agrega esto al final de request-schema.ts

export interface MarketParamsInput {
  symbol: string
}

export const parseMarketParams = (params: unknown): MarketParamsInput => {
  if (!isRecord(params)) {
    throw new ValidationError('Los parámetros deben ser un objeto.')
  }

  if (typeof params.symbol !== 'string' || !ASSET_PATTERN.test(params.symbol)) {
    throw new ValidationError('El parámetro symbol debe tener entre 1 y 12 caracteres alfanuméricos.')
  }

  return {
    symbol: params.symbol.toUpperCase(),
  }
}
