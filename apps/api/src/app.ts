import express, { type Express, type Request, type Response } from 'express'

import { recommendSupply } from './advisor/engine.js'
import type { AppConfig } from './config.js'
import { createRateLimiter, errorHandler, notFound, requestContext, securityHeaders, strictCors } from './http/middleware.js'
import { parseAdvisorRequest } from './http/request-schema.js'
import type { MarketProvider } from './providers/market-provider.js'
import { getStellarUserActivity, getStellarUserPositions } from './services/xoxno/xoxno.service.js'

const STELLAR_ACCOUNT_PATTERN = /^G[A-Z2-7]{55}$/

const readAccountAddress = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !STELLAR_ACCOUNT_PATTERN.test(value)) return undefined
  return value
}

export const createApp = (config: AppConfig, marketProvider: MarketProvider): Express => {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', false)

  app.use(requestContext)
  app.use(securityHeaders(config.environment === 'production'))
  app.use(strictCors(config.allowedOrigins))
  app.use(createRateLimiter({ maxRequests: 30, windowMs: 60_000 }))
  app.use(express.json({ limit: '8kb', strict: true, type: 'application/json' }))

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ data: { status: 'ok' } })
  })

  /* ---------- Endpoints de Mercados (con versión y alias directos) ---------- */
  app.get('/api/v1/markets', async (_req: Request, res: Response) => {
    const snapshot = await marketProvider.getMarketSnapshot()
    res.status(200).json({ data: snapshot })
  })

  app.get('/api/v1/markets/:symbol', async (req: Request, res: Response) => {
    const snapshot = await marketProvider.getMarketSnapshot()
    const symbolParam = req.params.symbol as string
    const market = snapshot.markets.find(
      (m) => m.asset.toLowerCase() === symbolParam.toLowerCase()
    )
    if (!market) {
      return res.status(404).json({ error: 'Mercado no encontrado' })
    }
    return res.status(200).json({ data: market })
  })

  // Alias directos para compatibilidad con llamadas frontend sin prefijo /api/v1
  app.get('/markets', async (_req: Request, res: Response) => {
    const snapshot = await marketProvider.getMarketSnapshot()
    res.status(200).json(snapshot.markets)
  })

  app.get('/markets/:symbol', async (req: Request, res: Response) => {
    const snapshot = await marketProvider.getMarketSnapshot()
    const symbolParam = req.params.symbol as string
    const market = snapshot.markets.find(
      (m) => m.asset.toLowerCase() === symbolParam.toLowerCase()
    )
    if (!market) {
      return res.status(404).json({ error: 'Mercado no encontrado' })
    }
    return res.status(200).json(market)
  })

  /* ---------- Endpoint de Recomendaciones del Asesor ---------- */
  app.post('/api/v1/advisor/recommendations', async (req: Request, res: Response) => {
    const input = parseAdvisorRequest(req.body)
    const snapshot = await marketProvider.getMarketSnapshot()
    const recommendation = recommendSupply(snapshot.markets, input, { expectedNetwork: config.network })
    res.status(200).json({
      data: {
        recommendation,
        marketSnapshotFetchedAt: snapshot.fetchedAt,
      },
    })
  })

  const handlePositions = async (req: Request, res: Response) => {
    const address = readAccountAddress(req.query.address)
    if (!address) return res.status(400).json({ error: 'Se requiere una dirección Stellar válida.' })
    return res.status(200).json(await getStellarUserPositions(address))
  }

  const handleActivity = async (req: Request, res: Response) => {
    const address = readAccountAddress(req.query.address)
    if (!address) return res.status(400).json({ error: 'Se requiere una dirección Stellar válida.' })
    return res.status(200).json(await getStellarUserActivity(address))
  }

  // XOXNO activity/positions, never infer DeFi actions from Horizon payments.
  app.get('/api/v1/positions', handlePositions)
  app.get('/positions', handlePositions)
  app.get('/api/v1/activity', handleActivity)
  app.get('/activity', handleActivity)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
