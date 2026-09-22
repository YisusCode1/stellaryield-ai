import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { DemoMarketProvider } from './providers/demo-market-provider.js'
import type { MarketProvider } from './providers/market-provider.js'
import { UnavailableMarketProvider } from './providers/unavailable-market-provider.js'
import { XoxnoMarketProvider } from './providers/xoxno-market-provider.js'

const config = loadConfig()
const marketProvider: MarketProvider =
  config.marketSource === 'demo'
    ? new DemoMarketProvider(config.network)
    : new XoxnoMarketProvider()

const app = createApp(config, marketProvider)

/* ---------- Ruta de Actividad (/activity) ---------- */
app.get('/activity', async (req, res) => {
  const address = req.query.address as string

  if (!address) {
    return res.json([])
  }

  try {
    const horizonUrl = `https://horizon-testnet.stellar.org/accounts/${address}/payments?limit=20&order=desc`
    const response = await fetch(horizonUrl)

    if (!response.ok) {
      return res.json([])
    }

    const data = (await response.json()) as { _embedded?: { records?: any[] } }
    const records = data._embedded?.records ?? []

    // Direcciones conocidas de Faucet para filtrar
    const faucetAddresses = [
      'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335WF2CCHB3XTT2EEA25M3OHWNO', // Circle USDC Faucet
    ]

    const activityList = records
      .filter((tx: any) => {
        // Excluir recargas de Faucets y transacciones de monto 0
        const isFaucet = faucetAddresses.includes(tx.from)
        const isZero = parseFloat(tx.amount ?? '0') === 0
        return !isFaucet && !isZero
      })
      .map((tx: any, idx: number) => {
        const isXlm = tx.asset_type === 'native'
        const symbol = isXlm ? 'XLM' : (tx.asset_code ?? 'USDC')
        const amount = parseFloat(tx.amount ?? '0')

        // Regla estricta:
        // Enviado por la wallet del usuario = Supply
        // Recibido por la wallet del usuario = Withdraw
        const type = tx.from === address ? 'Supply' : 'Withdraw'

        return {
          id: idx + 1,
          type,
          symbol,
          amount,
          date: new Date(tx.created_at).toLocaleDateString(),
          status: 'Completado',
        }
      })

    return res.json(activityList)
  } catch (error) {
    console.error('Error al procesar /activity:', error)
    return res.status(500).json({ error: 'Error interno al consultar la actividad' })
  }
})

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
