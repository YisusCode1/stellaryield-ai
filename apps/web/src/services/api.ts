// Capa de servicios: las pantallas SOLO llaman a estas funciones.
import { TransactionBuilder, rpc, Contract, Address, nativeToScVal, scValToNative } from '@stellar/stellar-sdk'
import { Networks } from '@stellar/stellar-sdk'
import { isConnected, getAddress, isAllowed, signTransaction } from '@stellar/freighter-api'
import { fmtUsd } from '../lib/format'
import type { Market } from '../lib/market'
import type { Goal } from '../lib/scoring'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Constantes globales del contrato desplegado
const VAULT_CONTRACT_ID = 'CA23V5M6O6DONEXJWZLYGM3CARXDXNL7HEBOTW7WKE7RLRZK7AF5BQQJ'
const USDC_SAC = 'CCQRAIMWN62JBVUCKCUJFZHDKXMSBHDP7KHFOXI3HETCTJUVIXW5SX7P'
const USDC_DECIMALS = 7

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

/**
 * Lee el balance REAL que el contrato del vault tiene guardado on-chain
 * para (user, token). Es una simulación de solo lectura: no gasta fee,
 * no requiere firma del usuario y no modifica estado.
 * Devuelve el monto en base units (sin dividir por los decimales del token).
 */
export async function getVaultBalanceRaw(userAddress: string, tokenAddress: string): Promise<bigint> {
  const server = new rpc.Server('https://soroban-testnet.stellar.org')
  const vaultContract = new Contract(VAULT_CONTRACT_ID)

  const op = vaultContract.call(
    'balance',
    new Address(userAddress).toScVal(),
    new Address(tokenAddress).toScVal(),
  )

  // Cuenta usada solo para armar la tx de simulación; no hace falta que firme nada.
  const account = await server.getAccount(userAddress)

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(op)
    .setTimeout(30)
    .build()

  const simResult = await server.simulateTransaction(tx)

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`No se pudo leer el balance del vault: ${simResult.error}`)
  }
  if (!simResult.result) {
    throw new Error('La simulación no devolvió resultado.')
  }

  return scValToNative(simResult.result.retval) as bigint
}

/**
 * Igual que getVaultBalanceRaw pero devuelve el número ya convertido
 * a unidades legibles (dividido por 10^decimals), listo para mostrar en UI.
 */
export async function getVaultBalance(userAddress: string, tokenAddress: string, decimals = USDC_DECIMALS): Promise<number> {
  const raw = await getVaultBalanceRaw(userAddress, tokenAddress)
  return Number(raw) / 10 ** decimals
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

  try {
    const [markets, depositedAmount] = await Promise.all([
      getMarkets(),
      getVaultBalance(publicKey, USDC_SAC, USDC_DECIMALS),
    ])

    const usdcMarket = markets.find(m => m.symbol === 'USDC')
    const priceUsd = usdcMarket?.priceUsd ?? 1

    // El balance de la posición ahora sale del contrato (fuente de verdad),
    // no del balance de wallet en Horizon.
    const positions: Position[] = depositedAmount > 0 ? [
      {
        symbol: 'USDC (Vault Custom)',
        type: 'Supply en Custom Vault',
        amount: depositedAmount,
        usd: depositedAmount * priceUsd,
        apy: 12.5,
        yearlyEstimateUsd: (depositedAmount * priceUsd * 12.5) / 100,
        assetAddress: USDC_SAC,
        hubId: 1,
        spokeId: 1,
        decimals: USDC_DECIMALS,
        accountNonce: '0',
      }
    ] : []

    const totalUsd = positions.reduce((sum, position) => sum + position.usd, 0)
    const yearlyEstimateUsd = positions.reduce((sum, position) => sum + position.yearlyEstimateUsd, 0)

    return {
      totalUsd,
      yearlyEstimateUsd,
      yearlyApy: totalUsd > 0 ? (yearlyEstimateUsd / totalUsd) * 100 : 0,
      positions,
    }
  } catch (error) {
    console.error('Error obteniendo el portafolio:', error)
    return {
      totalUsd: 0,
      yearlyEstimateUsd: 0,
      yearlyApy: 0,
      positions: [],
    }
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
    onStage('signing')

    const networkPassphrase = Networks.TESTNET
    const sorobanRpcUrl = 'https://soroban-testnet.stellar.org'

    const addressResult = await getAddress()
    const userAddress = typeof addressResult === 'string' ? addressResult : addressResult?.address
    if (!userAddress) throw new Error('No se pudo obtener una dirección válida de Freighter.')

    // Si el usuario pidió "retirar todo", el monto exacto sale del balance
    // real que el contrato tiene guardado, no de un cálculo hecho en el front.
    // Esto evita mandar un amount levemente por encima del balance real
    // (por redondeo) y disparar el panic "insufficient deposited balance".
    let amountBaseUnits: bigint
    if (input.kind === 'withdraw' && input.withdrawAll) {
      const realBalance = await getVaultBalanceRaw(userAddress, input.assetAddress)
      if (realBalance <= 0n) throw new Error('No hay balance depositado para retirar.')
      amountBaseUnits = realBalance
    } else {
      amountBaseUnits = BigInt(toBaseUnits(input.amount, input.decimals))
    }


    const server = new rpc.Server(sorobanRpcUrl)
    let account = await server.getAccount(userAddress)

    // PASO 1: Aprobación previa si la operación es 'supply'
    if (input.kind === 'supply') {
      const tokenContract = new Contract(USDC_SAC)
      const approveOperation = tokenContract.call(
        'approve',
        new Address(userAddress).toScVal(),
        new Address(VAULT_CONTRACT_ID).toScVal(),
        nativeToScVal(amountBaseUnits, { type: 'i128' }),
        nativeToScVal(6000000, { type: 'u32' })
      )

      const approveTx = new TransactionBuilder(account, {
        fee: '10000',
        networkPassphrase,
      })
        .addOperation(approveOperation)
        .setTimeout(30)
        .build()

      const preparedApproveTx = await server.prepareTransaction(approveTx)
      const signedApproveResult = await signTransaction(preparedApproveTx.toXDR(), {
        networkPassphrase,
        accountToSign: userAddress,
      } as any)
      const signedApproveXdr = typeof signedApproveResult === 'string' 
        ? signedApproveResult 
        : (signedApproveResult as any)?.signedTxXdr || (signedApproveResult as any)?.signedTx || signedApproveResult

      const signedApproveTxObj = TransactionBuilder.fromXDR(signedApproveXdr, networkPassphrase)
      const approveSendResult = await server.sendTransaction(signedApproveTxObj)

      if (approveSendResult.status === 'ERROR') {
        throw new Error(`Error en aprobación previa: ${JSON.stringify(approveSendResult)}`)
      }

      let approveStatus = await server.getTransaction(approveSendResult.hash)
      let approveAttempts = 0
      while (approveStatus.status === 'NOT_FOUND' && approveAttempts < 20) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        approveStatus = await server.getTransaction(approveSendResult.hash)
        approveAttempts += 1
      }

      account = await server.getAccount(userAddress)
    }

    // PASO 2: Invocación directa al Vault (deposit o withdraw)
    const vaultContract = new Contract(VAULT_CONTRACT_ID)

    let vaultOperation
    if (input.kind === 'supply') {
      vaultOperation = vaultContract.call(
        'deposit',
        new Address(userAddress).toScVal(),
        new Address(USDC_SAC).toScVal(),
        nativeToScVal(amountBaseUnits, { type: 'i128' })
      )
    } else {
      vaultOperation = vaultContract.call(
        'withdraw',
        new Address(userAddress).toScVal(),
        new Address(USDC_SAC).toScVal(),
        nativeToScVal(amountBaseUnits, { type: 'i128' })
      )
    }

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase,
    })
      .addOperation(vaultOperation)
      .setTimeout(30)
      .build()

    const preparedTx = await server.prepareTransaction(tx)
    
    // Firma asegurando el paso correcto de los parámetros que Freighter requiere para Soroban
    const signResult = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase,
      accountToSign: userAddress,
    } as any)

    const signedXdr = typeof signResult === 'string' 
      ? signResult 
      : (signResult as any)?.signedTxXdr || (signResult as any)?.signedTx || signResult

    onStage('confirming')

    if (typeof signedXdr !== 'string') throw new Error('Freighter no devolvió una transacción firmada válida.')
    const signedTransaction = TransactionBuilder.fromXDR(signedXdr, networkPassphrase)

    const sendResult = await server.sendTransaction(signedTransaction)

    if (sendResult.status === 'ERROR') {
      throw new Error(`Error enviando la transacción: ${JSON.stringify(sendResult)}`)
    }

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
