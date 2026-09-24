import type { Network } from '../domain/market.js'
import type { MarketProvider } from './market-provider.js'

export class DemoMarketProvider implements MarketProvider {
  constructor(private readonly network: Network) {}

  async getMarketSnapshot() {
    const updatedAt = new Date().toISOString()

    // Declaración de variables ANTES del return
    const rawMarkets = [
      {
        asset: 'USDC',
        supplyApyPercent: 6.42,
        borrowApyPercent: 9.1,
        availableLiquidityUsd: 25_000,
        totalSupplyUsd: 100_000,
        totalBorrowUsd: 75_000,
        utilizationPercent: 75,
        network: this.network,
        updatedAt,
      },
      {
        asset: 'XLM',
        supplyApyPercent: 3.15,
        borrowApyPercent: 5.6,
        availableLiquidityUsd: 8_500,
        totalSupplyUsd: 30_000,
        totalBorrowUsd: 19_800,
        utilizationPercent: 66,
        network: this.network,
        updatedAt,
      },
    ]

    const markets = rawMarkets.map((m) => ({
      ...m,
      symbol: m.asset,
      supplyApy: m.supplyApyPercent / 100,
      borrowApy: m.borrowApyPercent / 100,
      utilization: m.utilizationPercent / 100,
    }))

    // Objeto de retorno limpio
    return {
      fetchedAt: updatedAt,
      markets,
    }
  }
}
