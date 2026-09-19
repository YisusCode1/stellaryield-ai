import type { Network } from '../domain/market.js'
import type { MarketProvider } from './market-provider.js'

export class DemoMarketProvider implements MarketProvider {
  constructor(private readonly network: Network) {}

  async getMarketSnapshot() {
    const updatedAt = new Date().toISOString()

    return {
      fetchedAt: updatedAt,
      // Demonstration data only. It is created at request time so the Advisor's
      // freshness guard remains active in local development.
      markets: [
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
      ],
    }
  }
}
