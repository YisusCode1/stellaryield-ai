import express, { type Express, type Request, type Response } from 'express'

import { recommendSupply } from './advisor/engine.js'
import type { AppConfig } from './config.js'
import { createRateLimiter, errorHandler, notFound, requestContext, securityHeaders, strictCors } from './http/middleware.js'
import { parseAdvisorRequest, parseMarketParams } from './http/request-schema.js'
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

  /* ---------- Endpoints de Mercados (con versión y alias directos) ---------- */
  app.get('/api/v1/markets', async (_req: Request, res: Response) => {
    const snapshot = await marketProvider.getMarketSnapshot()
    return res.status(200).json({ data: snapshot })
  })

  app.get('/api/v1/markets/:symbol', async (req: Request, res: Response, next) => {
    try {
      const { symbol } = parseMarketParams(req.params)
      const snapshot = await marketProvider.getMarketSnapshot()
      const market = snapshot.markets.find(
        (m) => m.symbol.toLowerCase() === symbol.toLowerCase() || m.asset.toLowerCase() === symbol.toLowerCase()
      )
      if (!market) {
        return res.status(404).json({ error: 'Mercado no encontrado' })
      }
      return res.status(200).json({ data: market })
    } catch (error) {
      return next(error)
    }
  })

  // Alias directos para compatibilidad con llamadas frontend sin prefijo /api/v1
  app.get('/markets', async (_req: Request, res: Response) => {
    const snapshot = await marketProvider.getMarketSnapshot()
    return res.status(200).json(snapshot.markets)
  })

  app.get('/markets/:symbol', async (req: Request, res: Response, next) => {
    try {
      const { symbol } = parseMarketParams(req.params)
      const snapshot = await marketProvider.getMarketSnapshot()
      const market = snapshot.markets.find(
        (m) => m.symbol.toLowerCase() === symbol.toLowerCase() || m.asset.toLowerCase() === symbol.toLowerCase()
      )
      if (!market) {
        return res.status(404).json({ error: 'Mercado no encontrado' })
      }
      return res.status(200).json(market)
    } catch (error) {
      return next(error)
    }
  })

  /* ---------- Endpoint de Recomendaciones del Asesor ---------- */
  app.post('/api/v1/advisor/recommendations', async (req: Request, res: Response, next) => {
    try {
      const input = parseAdvisorRequest(req.body)
      const snapshot = await marketProvider.getMarketSnapshot()
      const recommendation = recommendSupply(snapshot.markets, input, { expectedNetwork: config.network })
      res.status(200).json({
        data: {
          recommendation,
          marketSnapshotFetchedAt: snapshot.fetchedAt,
        },
      })
    } catch (error) {
      next(error)
    }
  })

  /* ---------- Handler para Actividad (Supply / Withdraw) ---------- */
  const handleActivity = async (req: Request, res: Response) => {
    const address = req.query.address as string
    if (!address) return res.status(200).json([])

    try {
      const horizonUrl = `https://horizon-testnet.stellar.org/accounts/${address}/payments?limit=30&order=desc`
      const response = await fetch(horizonUrl)

      if (!response.ok) return res.status(200).json([])

      const data = (await response.json()) as { _embedded?: { records?: any[] } }
      const records = data._embedded?.records ?? []

      const activityList: any[] = []

      records.forEach((tx: any, idx: number) => {
        const amount = parseFloat(tx.amount ?? '0')
        if (amount === 0) return

        const isXlm = tx.asset_type === 'native'
        const symbol = isXlm ? 'XLM' : (tx.asset_code ?? 'USDC')

        // 1. Si la cuenta activa envió fondos = Supply (Depósito en el protocolo XOXNO)
        if (tx.from === address) {
          activityList.push({
            id: idx + 1,
            type: 'Supply',
            symbol,
            amount,
            date: new Date(tx.created_at).toLocaleDateString(),
            status: 'Completado',
          })
        }
        // 2. Si la cuenta recibió fondos pero la transacción tiene un Memo de contrato o proviene del Vault = Withdraw
        else if (tx.to === address && (tx.memo_type || tx.from === config.vaultContractId)) {
          activityList.push({
            id: idx + 1,
            type: 'Withdraw',
            symbol,
            amount,
            date: new Date(tx.created_at).toLocaleDateString(),
            status: 'Completado',
          })
        }
      })

      return res.status(200).json(activityList)
    } catch (error) {
      console.error('Error procesando actividad:', error)
      return res.status(500).json({ error: 'Error al consultar transacciones' })
    }
  }

  // Rutas de actividad (con versión y alias directo)
  app.get('/api/v1/activity', handleActivity)
  app.get('/activity', handleActivity)

  app.use(notFound)
  app.use(errorHandler)
  return app
}