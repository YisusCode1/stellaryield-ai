import type { MarketSnapshot } from '../domain/market.js'

/**
 * Port owned by Persona 1's XOXNO integration. The Advisor deliberately only
 * depends on this read-only interface; it cannot receive a wallet or signer.
 */
export interface MarketProvider {
  getMarketSnapshot(): Promise<MarketSnapshot>
}
