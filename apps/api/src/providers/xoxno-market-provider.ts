import type { MarketProvider } from './market-provider.js'
import type { MarketSnapshot } from '../domain/market.js'
import { getStellarMarkets } from '../services/xoxno/xoxno.service.js'

export class XoxnoMarketProvider implements MarketProvider {
  async getMarketSnapshot(): Promise<MarketSnapshot> {
    const rawMarkets = await getStellarMarkets()

    const markets = rawMarkets.map((item) => ({
      id: item.assetId,
      asset: item.symbol, // El motor busca "asset"
      symbol: item.symbol,
      protocol: 'XOXNO',
      chain: 'STELLAR',
      network: 'testnet', // Debe coincidir con config.network
      supplyApyPercent: item.supplyApy, // El motor busca "supplyApyPercent"
      borrowApyPercent: 0,
      totalSupplyUsd: item.availableLiquidityUsd,
      totalBorrowUsd: 0,
      availableLiquidityUsd: item.availableLiquidityUsd,
      utilizationPercent: item.utilizationRate, // El motor busca "utilizationPercent"
      updatedAt: new Date().toISOString(),
    }))

    return {
      fetchedAt: new Date().toISOString(),
      markets: markets as any,
    }
  }
}