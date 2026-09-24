import type { MarketProvider } from './market-provider.js'
import type { MarketSnapshot } from '../domain/market.js'
import { getStellarMarkets } from '../services/xoxno/xoxno.service.js'

export class XoxnoMarketProvider implements MarketProvider {
  async getMarketSnapshot(): Promise<MarketSnapshot> {
    const rawMarkets = await getStellarMarkets()

    const markets = rawMarkets.map((item) => ({
      id: item.assetId,
      asset: item.symbol, // El motor busca "asset"
      protocol: 'XOXNO',
      chain: 'STELLAR',
      network: 'testnet' as const, // Debe coincidir con config.network
      assetAddress: item.assetId,
      hubId: item.hubId,
      spokeId: item.spokeId,
      decimals: item.decimals,
      priceUsd: item.priceUsd,
      supplyEnabled: item.supplyEnabled,
      supplyApyPercent: item.supplyApy,
      borrowApyPercent: item.borrowApy,
      totalSupplyUsd: item.totalDepositsUsd,
      totalBorrowUsd: item.totalBorrowsUsd,
      availableLiquidityUsd: item.availableLiquidityUsd,
      utilizationPercent: item.utilizationRate, // El motor busca "utilizationPercent"
      updatedAt: new Date().toISOString(),
    }))

    return {
      fetchedAt: new Date().toISOString(),
      markets,
    }
  }
}
