import { createApp } from './app.js'
import { loadConfig } from './config.js'
import type { MarketProvider } from './providers/market-provider.js'
import { XoxnoMarketProvider } from './providers/xoxno-market-provider.js'

const config = loadConfig()
const marketProvider: MarketProvider = new XoxnoMarketProvider()

const app = createApp(config, marketProvider)

/* ---------- Servidor e Inicio ---------- */
const server = app.listen(config.port, () => {
  console.log(`StellarYield API listening on port ${config.port} (${config.network}, ${config.marketSource} markets).`)
})

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`${signal} received; closing API server.`)
  server.close((error) => {
    if (error !== undefined) {
      console.error('API shutdown failed', error)
      process.exitCode = 1
    }
    process.exit()
  })
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
