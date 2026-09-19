import assert from 'node:assert/strict'
import test from 'node:test'

import { recommendSupply } from './engine.js'
import type { AdvisorInput, Market } from '../domain/market.js'

const now = new Date('2026-09-19T17:00:00.000Z')

const baseMarket = (overrides: Partial<Market> = {}): Market => ({
  asset: 'USDC',
  supplyApyPercent: 6.42,
  borrowApyPercent: 9.1,
  availableLiquidityUsd: 2_500,
  totalSupplyUsd: 10_000,
  totalBorrowUsd: 7_500,
  utilizationPercent: 75,
  network: 'testnet',
  updatedAt: '2026-09-19T16:59:00.000Z',
  ...overrides,
})

const moderateInput: AdvisorInput = {
  amountUsd: 100,
  riskProfile: 'moderate',
  preferredAsset: 'USDC',
}

test('recommends the eligible market with a clear rationale', () => {
  const result = recommendSupply([baseMarket()], moderateInput, {
    now,
    expectedNetwork: 'testnet',
  })

  assert.equal(result.status, 'recommended')
  assert.equal(result.action, 'supply')
  assert.equal(result.asset, 'USDC')
  assert.equal(result.currentSupplyApyPercent, 6.42)
  assert.equal(result.reasons.length, 3)
  assert.equal(result.cautions.length, 2)
})

test('does not recommend a market above the utilization cap', () => {
  const result = recommendSupply([baseMarket({ utilizationPercent: 86 })], moderateInput, {
    now,
    expectedNetwork: 'testnet',
  })

  assert.equal(result.status, 'not_recommended')
  assert.equal(result.action, undefined)
})

test('does not recommend stale or cross-network market data', () => {
  const stale = baseMarket({ updatedAt: '2026-09-19T16:50:00.000Z' })
  const mainnet = baseMarket({ network: 'mainnet' })

  for (const market of [stale, mainnet]) {
    const result = recommendSupply([market], moderateInput, {
      now,
      expectedNetwork: 'testnet',
    })
    assert.equal(result.status, 'not_recommended')
  }
})

test('uses APY, then liquidity and utilization as deterministic ordering rules', () => {
  const higherApy = baseMarket({ asset: 'USDC', supplyApyPercent: 6.5, availableLiquidityUsd: 500 })
  const lowerApy = baseMarket({ asset: 'USDC', supplyApyPercent: 6.4, availableLiquidityUsd: 50_000 })
  const result = recommendSupply([lowerApy, higherApy], moderateInput, {
    now,
    expectedNetwork: 'testnet',
  })

  assert.equal(result.status, 'recommended')
  assert.equal(result.currentSupplyApyPercent, 6.5)
})
