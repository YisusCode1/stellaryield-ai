// Capa de servicios: las pantallas SOLO llaman a estas funciones.
import { TransactionBuilder, rpc } from '@stellar/stellar-sdk'
import { isConnected, getAddress, isAllowed, signTransaction } from '@stellar/freighter-api'
import {
  buildStellarSupplyTx,
  buildStellarWithdrawTx,
  prepareStellarBuiltTx,
  STELLAR_NETWORKS,
} from '@xoxno/sdk-js/stellar-lending'
import { fmtUsd } from '../lib/format'
import type { Market } from '../lib/market'
import type { Goal } from '../lib/scoring'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/* ---------- Tipos ---------- */
export interface WalletInfo {
  address: string
  network: string
  totalUsd: number
  totalUsdc: number
  balances: { symbol: string; amount: number; usd: number }[]
}
export interface Position {
  symbol: string
  type: string
  amount: number
  usd: number
  apy: number
  yearlyEstimateUsd: number
  assetAddress: string
  hubId: number
  spokeId: number
  decimals: number
  accountNonce: string
}
export interface PortfolioInfo {
  totalUsd: number
  yearlyEstimateUsd: number
  yearlyApy: number
  positions: Position[]
}
export interface ActivityItem { id: number; type: string; symbol: string; amount: number; date: string; status: string }
export interface AdvisorRecommendation {
  status: 'recommended' | 'not_recommended'
  action?: 'supply'
  asset?: string
  amountUsd?: number
  currentSupplyApyPercent?: number
  risk?: 'Bajo' | 'Moderado' | 'Alto'
  confidence?: 'high' | 'medium' | 'low'
  reasons: string[]
  cautions: string[]
  marketUpdatedAt?: string
  generatedAt: string
  disclaimer: string
}

export interface Recommendation {
  recommendation: AdvisorRecommendation
  market?: Market
  yearlyUsd?: number
}

export interface TxInput {
  kind: 'supply' | 'withdraw'
  symbol: string
  amount: number
  assetAddress: string
  hubId: number
  spokeId: number
  decimals: number
  accountNonce?: string
  withdrawAll?: boolean
}
export type TxStage = 'signing' | 'confirming'
export interface TxResult { hash: string }

/* ---------- Utilidades ---------- */
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) throw new Error(`No se pudo completar la solicitud (${res.status}).`)
  return (await res.json()) as T
}
const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })

/* ---------- Lecturas de Mercado ---------- */
export const getMarkets = async (): Promise<Market[]> => {
  const rawMarkets = await http<any[]>('/markets')

  return rawMarkets.map((m) => {
    const supplyApy = Number(m.supplyApyPercent)
    const borrowApy = Number(m.borrowApyPercent)
    const utilization = Number(m.utilizationPercent)
    const liquidityUsd = Number(m.availableLiquidityUsd)
    const symbol = typeof m.asset === 'string' ? m.asset : ''
    const assetAddress = typeof m.assetAddress === 'string' ? m.assetAddress : ''

    if (!symbol || !assetAddress || !Number.isInteger(m.hubId) || !Number.isInteger(m.spokeId)) {
      throw new Error('XOXNO devolvió un mercado incompleto; no se puede preparar una transacción segura.')
    }

    return {
      symbol,
      supplyApy: requireFinite(supplyApy, 'supply APY'),
      borrowApy: requireFinite(borrowApy, 'borrow APY'),
      utilization: requireFinite(utilization, 'utilización'),
      liquidity: fmtUsd(requireFinite(liquidityUsd, 'liquidez')),
      liquidityUsd: requireFinite(liquidityUsd, 'liquidez'),
      network: 'Stellar Testnet',
      risk: utilization >= 90 ? 'alto' : utilization >= 70 ? 'medio' : 'bajo',
      assetAddress,
      hubId: m.hubId,
      spokeId: m.spokeId,
      decimals: requireInteger(m.decimals, 'decimales'),
      priceUsd: requireFinite(Number(m.priceUsd), 'precio USD'),
      supplyEnabled: m.supplyEnabled === true,
    }
  })
}

export async function getMarket(symbol: string): Promise<Market | undefined> {
  const all = await getMarkets()
  return all.find((m) => m.symbol.toLowerCase() === symbol.toLowerCase())
}

export async function getWallet(publicKey?: string): Promise<WalletInfo> {
  if (!publicKey) {
    return { address: '', network: 'Testnet', totalUsd: 0, totalUsdc: 0, balances: [] }
  }

  const [res, currentMarkets] = await Promise.all([
    fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`),
    getMarkets(),
  ])
  if (!res.ok) throw new Error('Cuenta no encontrada o sin saldo en Stellar Testnet.')

  const data = await res.json()
  const priceBySymbol = new Map(currentMarkets.map((market) => [market.symbol, market.priceUsd]))
  let totalUsd = 0
  let totalUsdc = 0
  const balances = data.balances.map((balance: any) => {
    const symbol = balance.asset_type === 'native' ? 'XLM' : balance.asset_code
    const amount = Number.parseFloat(balance.balance)
    if (!symbol || !Number.isFinite(amount)) throw new Error('Horizon devolvió un balance inválido.')
    const priceUsd = priceBySymbol.get(symbol)
    const usd = priceUsd === undefined ? 0 : amount * priceUsd
    totalUsd += usd
    if (symbol === 'USDC') totalUsdc += amount
    return { symbol, amount, usd }
  })
  return { address: publicKey, network: 'Testnet', totalUsd, totalUsdc, balances }
}

export async function getPortfolio(publicKey?: string): Promise<PortfolioInfo> {
  if (!publicKey) {
    return {
      totalUsd: 0,
      yearlyEstimateUsd: 0,
      yearlyApy: 0,
      positions: [],
    }
  }

  const [rawPositions, currentMarkets] = await Promise.all([
    http<{ positions?: any[] }>(`/positions?address=${encodeURIComponent(publicKey)}`),
    getMarkets(),
  ])

  const marketByCoordinate = new Map(
    currentMarkets.map((market) => [`${market.spokeId}:${market.hubId}:${market.assetAddress}`, market])
  )
  const pos: Position[] = (rawPositions.positions ?? [])
    .filter((position) => BigInt(position.supplyAmount ?? '0') > 0n)
    .map((position) => {
      const market = marketByCoordinate.get(`${position.spokeId}:${position.hubId}:${position.asset}`)
      const amount = rayToNumber(position.supplyAmount ?? '0')
      const priceUsd = market?.priceUsd ?? 0
      const usd = amount * priceUsd
      const apy = market?.supplyApy ?? 0
      return {
        symbol: market?.symbol ?? shortAsset(position.asset),
        type: 'Supply en XOXNO',
        amount,
        usd,
        apy,
        yearlyEstimateUsd: (usd * apy) / 100,
        assetAddress: position.asset,
        hubId: position.hubId,
        spokeId: position.spokeId,
        decimals: market?.decimals ?? 7,
        accountNonce: position.accountId,
      }
    })

  const totalUsd = pos.reduce((sum, position) => sum + position.usd, 0)
  const yearlyEstimateUsd = pos.reduce((sum, position) => sum + position.yearlyEstimateUsd, 0)

  return {
    totalUsd,
    yearlyEstimateUsd,
    yearlyApy: totalUsd > 0 ? (yearlyEstimateUsd / totalUsd) * 100 : 0,
    positions: pos,
  }
}

export async function getActivity(publicKey?: string): Promise<ActivityItem[]> {
  if (!publicKey) return []

  const items = await http<any[]>(`/activity?address=${encodeURIComponent(publicKey)}`)
  return items.map((item, index) => ({
    id: Number(item.seq ?? index + 1),
    type: String(item.action ?? 'Operación'),
    symbol: String(item.symbol ?? shortAsset(String(item.token ?? ''))),
    amount: Number(item.amountShort ?? 0),
    date: new Date(item.timestamp).toLocaleDateString(),
    status: String(item.status ?? 'Registrada'),
  }))
}

export async function getRecommendation(goal: Goal, amount: number, token: string): Promise<Recommendation> {
  const currentMarkets = await getMarkets()
  const preferredMarket = currentMarkets.find((market) => market.symbol.toLowerCase() === token.toLowerCase())
  if (!preferredMarket) throw new Error(`No hay precio verificable de XOXNO para ${token}.`)
  const riskProfile = goal === 'safe' ? 'conservative' : goal === 'liquidity' ? 'moderate' : 'aggressive'
  const response = await http<{ data: { recommendation: AdvisorRecommendation } }>('/api/v1/advisor/recommendations', post({
    amountUsd: amount * preferredMarket.priceUsd,
    riskProfile,
    preferredAsset: preferredMarket.symbol,
  }))
  const recommendation = response.data.recommendation
  const market = recommendation.asset === undefined
    ? undefined
    : currentMarkets.find((candidate) => candidate.symbol.toLowerCase() === recommendation.asset!.toLowerCase())
  return {
    recommendation,
    market,
    yearlyUsd: recommendation.amountUsd !== undefined && recommendation.currentSupplyApyPercent !== undefined
      ? (recommendation.amountUsd * recommendation.currentSupplyApyPercent) / 100
      : undefined,
  }
}

/* ---------- Web3 & Soroban ---------- */
export async function connectWallet(): Promise<{ address: string }> {
  const connected = await isConnected()
  if (!connected) throw new Error('La extensión de Freighter no está instalada.')
  const allowed = await isAllowed()
  const addressResult = await getAddress()
  const address = typeof addressResult === 'string' ? addressResult : addressResult?.address
  if (!allowed || !address) throw new Error('Permiso denegado por la billetera Freighter.')
  return { address }
}

const shortAsset = (asset: string) => asset.length > 12 ? `${asset.slice(0, 4)}…${asset.slice(-4)}` : asset

const rayToNumber = (value: string): number => {
  const ray = BigInt(value)
  const denominator = 10n ** 27n
  const whole = ray / denominator
  const fraction = ray % denominator
  // Keep a bounded precision when crossing the BigInt/Number boundary for UI.
  return Number(whole) + Number(fraction / (10n ** 15n)) / 1_000_000_000_000
}

const toBaseUnits = (amount: number, decimals: number): string => {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error('El activo tiene una precisión no compatible.')
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new Error('El monto no es válido.')
  const [whole, fraction = ''] = amount.toFixed(decimals).split('.')
  return `${whole}${fraction.padEnd(decimals, '0')}`.replace(/^0+(?=\d)/, '')
}

const requireFinite = (value: number, field: string): number => {
  if (!Number.isFinite(value)) throw new Error(`XOXNO devolvió ${field} inválido.`)
  return value
}

const requireInteger = (value: unknown, field: string): number => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`XOXNO devolvió ${field} inválidos.`)
  return parsed
}

export async function submitTransaction(input: TxInput, onStage: (s: TxStage) => void): Promise<TxResult> {
  try {
      if (!/^C[A-Z2-7]{55}$/.test(input.assetAddress)) throw new Error('El activo de XOXNO no es un contrato Soroban válido.')
      if (!Number.isInteger(input.hubId) || input.hubId <= 0 || !Number.isInteger(input.spokeId) || input.spokeId <= 0) {
        throw new Error('El mercado de XOXNO no tiene una coordenada válida.')
      }
      if (input.kind === 'withdraw' && !input.accountNonce) throw new Error('No se encontró la cuenta de lending para el retiro.')

      onStage('signing')

      const deployment = STELLAR_NETWORKS.stellarTestnet
      const networkPassphrase = deployment.passphrase
      const addressResult = await getAddress()
      const userAddress = typeof addressResult === 'string' ? addressResult : addressResult?.address
      if (!userAddress) throw new Error('No se pudo obtener una dirección válida de Freighter.')

      const server = new rpc.Server(deployment.sorobanRpcUrl)
      const account = await server.getAccount(userAddress)
      const builderOptions = {
        network: 'testnet' as const,
        caller: userAddress,
        sourceSequence: account.sequenceNumber(),
        controllerAddress: deployment.lendingController,
      }
      const amount = input.kind === 'withdraw' && input.withdrawAll ? '0' : toBaseUnits(input.amount, input.decimals)
      const built = input.kind === 'supply'
        ? buildStellarSupplyTx(builderOptions, {
            accountNonce: 0,
            spokeId: input.spokeId,
            hubId: input.hubId,
            asset: input.assetAddress,
            amount,
          })
        : buildStellarWithdrawTx(builderOptions, {
            accountNonce: input.accountNonce!,
            hubId: input.hubId,
            asset: input.assetAddress,
            amount,
          })
      const preparedXdr = await prepareStellarBuiltTx(server, built, {
        network: 'testnet',
        invokedContractId: deployment.lendingController,
      })

      const signResult = await signTransaction(preparedXdr, {
        networkPassphrase,
      })

      // Aseguramos obtener la cadena XDR independientemente del formato devuelto por Freighter
      const signedXdr = typeof signResult === 'string' ? signResult : (signResult as any)?.signedTxXdr || signResult

      onStage('confirming')

      // Reconstruimos el objeto Transaction desde la cadena XDR
      if (typeof signedXdr !== 'string') throw new Error('Freighter no devolvió una transacción firmada válida.')
      const signedTransaction = TransactionBuilder.fromXDR(signedXdr, networkPassphrase)

      // Se envía el objeto Transaction reconstruido a la RPC
      let sendResult = await server.sendTransaction(signedTransaction)

      if (sendResult.status === 'ERROR') {
        throw new Error(`Error enviando la transacción: ${JSON.stringify(sendResult)}`)
      }

      // Polling bounded to avoid leaving the UI in a permanent confirming state.
      let statusResponse = await server.getTransaction(sendResult.hash)
      let attempts = 0
      const maxAttempts = 30
      while (statusResponse.status === 'NOT_FOUND' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        statusResponse = await server.getTransaction(sendResult.hash)
        attempts += 1
      }

      if (statusResponse.status === 'NOT_FOUND') {
        throw new Error('La transacción sigue pendiente. Consulta el hash en el explorador antes de reintentar.')
      }

      if (statusResponse.status === 'SUCCESS') {
        return { hash: sendResult.hash }
      } else {
        throw new Error(`Transacción fallida en la red con estado: ${statusResponse.status}`)
      }

  } catch (err: any) {
    console.error('Error en transacción de Soroban:', err)
    throw new Error(`Error en la transacción real: ${err.message || 'Transacción fallida'}`)
  }
}
