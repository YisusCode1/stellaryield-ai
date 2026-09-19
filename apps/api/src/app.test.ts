import assert from 'node:assert/strict'
import test from 'node:test'

import { createApp } from './app.js'
import type { AppConfig } from './config.js'
import { DemoMarketProvider } from './providers/demo-market-provider.js'

const config: AppConfig = {
  environment: 'test',
  port: 3000,
  network: 'testnet',
  allowedOrigins: ['http://localhost:5173'],
  marketSource: 'demo',
}

const withServer = async (run: (baseUrl: string) => Promise<void>): Promise<void> => {
  const server = createApp(config, new DemoMarketProvider('testnet')).listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Test server address is unavailable.')

  try {
    await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error === undefined ? resolve() : reject(error)))
    })
  }
}

test('serves an explainable recommendation with defensive response headers', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/advisor/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify({ amountUsd: 100, riskProfile: 'moderate', preferredAsset: 'USDC' }),
    })
    const body = await response.json() as { data: { recommendation: { status: string; asset?: string } } }

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(response.headers.get('x-powered-by'), null)
    assert.equal(body.data.recommendation.status, 'recommended')
    assert.equal(body.data.recommendation.asset, 'USDC')
  })
})

test('rejects cross-origin and malformed advisor requests', async () => {
  await withServer(async (baseUrl) => {
    const blocked = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'https://untrusted.example' },
    })
    assert.equal(blocked.status, 403)

    const invalid = await fetch(`${baseUrl}/api/v1/advisor/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountUsd: 100, riskProfile: 'moderate', seedPhrase: 'not allowed' }),
    })
    const body = await invalid.json() as { error: { code: string } }
    assert.equal(invalid.status, 400)
    assert.equal(body.error.code, 'VALIDATION_ERROR')
  })
})
