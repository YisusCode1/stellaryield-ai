import express, { type Express, type Request, type Response } from 'express'

import { recommendSupply } from './advisor/engine.js'
import type { AppConfig } from './config.js'
import { createRateLimiter, errorHandler, notFound, requestContext, securityHeaders, strictCors } from './http/middleware.js'
import { parseAdvisorRequest } from './http/request-schema.js'
import type { MarketProvider } from './providers/market-provider.js'

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

  app.get('/api/v1/markets', async (_req: Request, res: Response) => {
    const snapshot = await marketProvider.getMarketSnapshot()
    res.status(200).json({ data: snapshot })
  })

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

  app.use(notFound)
  app.use(errorHandler)
  return app
}
