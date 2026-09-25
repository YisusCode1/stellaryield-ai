import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { config as loadDotenv } from 'dotenv'

import type { Network } from './domain/market.js'

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'] as const
const sourceDirectory = dirname(fileURLToPath(import.meta.url))

// Support both a workspace-local file and the documented repository-root .env.
// dotenv never overrides values supplied by the deployment environment.
loadDotenv({ path: resolve(sourceDirectory, '../.env'), quiet: true })
loadDotenv({ path: resolve(sourceDirectory, '../../../.env'), quiet: true })

const readNetwork = (value: string | undefined): Network => {
  if (value === undefined || value === 'testnet') return 'testnet'
  throw new Error('STELLAR_NETWORK must be "testnet". Mainnet is intentionally disabled.')
}

const readPort = (value: string | undefined): number => {
  if (value === undefined || value === '') return 3000
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error('API_PORT must be an integer between 1 and 65535.')
  }
  return parsed
}

const readOrigins = (value: string | undefined): readonly string[] => {
  const origins = (value ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (origins.length === 0) throw new Error('ALLOWED_ORIGINS cannot be empty.')

  for (const origin of origins) {
    const parsed = new URL(origin)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(`ALLOWED_ORIGINS contains an invalid origin: ${origin}`)
    }
  }
  return Object.freeze([...new Set(origins)])
}

const readMarketSource = (value: string | undefined): 'xoxno' => {
  if (value === undefined || value === 'xoxno') return 'xoxno'
  throw new Error('ADVISOR_MARKET_SOURCE must be "xoxno". Demo markets are disabled.')
}

export interface AppConfig {
  environment: 'development' | 'test' | 'production'
  port: number
  network: Network
  allowedOrigins: readonly string[]
  marketSource: 'xoxno'
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const environmentValue = env.NODE_ENV ?? 'development'
  if (!['development', 'test', 'production'].includes(environmentValue)) {
    throw new Error('NODE_ENV must be development, test or production.')
  }

  const environment = environmentValue as AppConfig['environment']
  if (environment === 'production' && env.ALLOWED_ORIGINS === undefined) {
    throw new Error('ALLOWED_ORIGINS must be explicitly set in production.')
  }

  const allowedOrigins = readOrigins(env.ALLOWED_ORIGINS)
  const marketSource = readMarketSource(env.ADVISOR_MARKET_SOURCE)
  if (environment === 'production') {
    if (allowedOrigins.some((origin) => new URL(origin).protocol !== 'https:')) {
      throw new Error('ALLOWED_ORIGINS must use HTTPS in production.')
    }
  }

  return Object.freeze({
    environment,
    port: readPort(env.API_PORT),
    network: readNetwork(env.STELLAR_NETWORK),
    allowedOrigins,
    marketSource,
  })
}
