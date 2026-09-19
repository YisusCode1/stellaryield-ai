import assert from 'node:assert/strict'
import test from 'node:test'

import { ValidationError } from '../domain/errors.js'
import { parseAdvisorRequest } from './request-schema.js'

test('normalizes a valid preferred asset', () => {
  const input = parseAdvisorRequest({
    amountUsd: 100,
    riskProfile: 'moderate',
    preferredAsset: 'usdc',
  })

  assert.deepEqual(input, {
    amountUsd: 100,
    riskProfile: 'moderate',
    preferredAsset: 'USDC',
  })
})

test('rejects invalid amounts, profiles and unexpected properties', () => {
  const invalidBodies: unknown[] = [
    { amountUsd: 0, riskProfile: 'moderate' },
    { amountUsd: Number.POSITIVE_INFINITY, riskProfile: 'moderate' },
    { amountUsd: 10, riskProfile: 'unsafe' },
    { amountUsd: 10, riskProfile: 'moderate', walletSecret: 'never accepted' },
    { amountUsd: 10, riskProfile: 'moderate', preferredAsset: 'USDC<script>' },
  ]

  for (const body of invalidBodies) {
    assert.throws(() => parseAdvisorRequest(body), ValidationError)
  }
})
