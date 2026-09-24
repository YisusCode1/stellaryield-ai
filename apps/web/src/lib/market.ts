export type Risk = 'bajo' | 'medio' | 'alto'

/** Market data normalized from the XOXNO API. No values in this type are demo defaults. */
export interface Market {
  symbol: string
  network: 'Stellar Testnet'
  supplyApy: number
  borrowApy: number
  utilization: number
  liquidity: string
  liquidityUsd: number
  risk: Risk
  assetAddress: string
  hubId: number
  spokeId: number
  decimals: number
  priceUsd: number
  supplyEnabled: boolean
}
