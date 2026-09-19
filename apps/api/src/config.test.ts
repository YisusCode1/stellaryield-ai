import assert from 'node:assert/strict'
import test from 'node:test'

import { loadConfig } from './config.js'

test('requires explicit HTTPS origins and a real provider in production', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'production', ADVISOR_MARKET_SOURCE: 'xoxno' }),
    /ALLOWED_ORIGINS must be explicitly set/,
  )
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'http://app.example.com',
      ADVISOR_MARKET_SOURCE: 'xoxno',
    }),
    /must use HTTPS/,
  )
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://app.example.com',
      ADVISOR_MARKET_SOURCE: 'demo',
    }),
    /not allowed in production/,
  )
})

test('uses safe development defaults', () => {
  const config = loadConfig({ NODE_ENV: 'development' })
  assert.equal(config.network, 'testnet')
  assert.deepEqual(config.allowedOrigins, ['http://localhost:5173'])
  assert.equal(config.marketSource, 'xoxno')
})
