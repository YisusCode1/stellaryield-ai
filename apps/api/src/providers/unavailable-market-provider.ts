import { ServiceUnavailableError } from '../domain/errors.js'
import type { MarketSnapshot } from '../domain/market.js'
import type { MarketProvider } from './market-provider.js'

/** Safe default until the XOXNO adapter is supplied by Persona 1. */
export class UnavailableMarketProvider implements MarketProvider {
  async getMarketSnapshot(): Promise<MarketSnapshot> {
    throw new ServiceUnavailableError('El proveedor XOXNO todavía no está configurado.')
  }
}
