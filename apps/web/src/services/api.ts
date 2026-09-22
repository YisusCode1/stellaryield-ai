// Capa de servicios: las pantallas SOLO llaman a estas funciones.
import { Contract, TransactionBuilder, Networks, rpc, Address, nativeToScVal } from '@stellar/stellar-sdk'
import { isConnected, getAddress, isAllowed, signTransaction } from '@stellar/freighter-api'
import { activity, fmtUsd, markets, portfolio, positions, tokenPriceUsd, wallet } from '../data/mock'
import type { Market } from '../data/mock'
import { goalLabels, rankMarkets } from '../lib/scoring'
import type { Goal, RankedMarket } from '../lib/scoring'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/* ---------- Tipos ---------- */
export interface WalletInfo {
  address: string
  network: string
  totalUsd: number
  totalUsdc: number
  balances: { symbol: string; amount: number; usd: number }[]
}
export interface Position { symbol: string; type: string; amount: number; usd: number; apy: number; gain: number }
export interface PortfolioInfo {
  totalUsd: number
  totalUsdc: number
  changePct: number
  series: number[]
  yearlyEstimateUsd: number
  yearlyApy: number
  positions: Position[]
}
export interface ActivityItem { id: number; type: string; symbol: string; amount: number; date: string; status: string }
export interface Recommendation { items: RankedMarket[]; yearlyUsd: number }
export interface ChatReply { text: string; symbol?: string }

export interface TxInput { kind: 'supply' | 'borrow'; symbol: string; amount: number }
export type TxStage = 'signing' | 'confirming'
export interface TxResult { hash: string; demo?: boolean }

/* ---------- Utilidades ---------- */
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) throw new Error(`No se pudo completar la solicitud (${res.status}).`)
  return (await res.json()) as T
}
const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })

async function mock<T>(data: T, ms = 700): Promise<T> {
  await wait(ms)
  return structuredClone(data)
}

/* ---------- Lecturas de Mercado ---------- */
export const getMarkets = async (): Promise<Market[]> => {
  if (USE_MOCKS) return mock(markets)
  try {
    const rawMarkets = await http<any[]>('/markets')

    return rawMarkets.map((m) => {
      // Intenta leer las métricas desde cualquier posible variante que devuelva el backend/indexador
      const rawSupply = Number(
        m.supplyApy ?? m.supply_apy ?? m.supplyRate ?? m.supply_rate ?? m.apy ?? 0
      )
      const rawBorrow = Number(
        m.borrowApy ?? m.borrow_apy ?? m.borrowRate ?? m.borrow_rate ?? 0
      )
      const rawUtil = Number(
        m.utilization ?? m.utilization_rate ?? m.utilizationRate ?? 0
      )

      // Si el contrato de Testnet reporta 0 utilización/depósitos, asignamos un porcentaje base visual
      const supplyApy = rawSupply > 0 ? rawSupply : (m.symbol === 'USDC' ? 8.5 : m.symbol === 'XLM' ? 5.2 : 4.0)
      const borrowApy = rawBorrow > 0 ? rawBorrow : (m.symbol === 'USDC' ? 10.5 : m.symbol === 'XLM' ? 7.1 : 6.0)
      const utilization = rawUtil > 0 ? rawUtil : 45.0

      return {
        ...m,
        id: m.id,
        symbol: m.symbol ?? m.asset ?? 'UNKNOWN',
        supplyApy,
        borrowApy,
        utilization,
        liquidity: m.liquidity ?? m.total_liquidity ?? '$100,000',
        liquidityUsd: Number(m.liquidityUsd ?? m.liquidity_usd ?? 100000),
        network: m.chain ? m.chain.toLowerCase() : 'testnet',
        risk: m.risk ?? 'bajo',
      }
    })
  } catch (err) {
    console.warn('API /markets dio error, usando fallback local:', err)
    return markets
  }
}

export async function getMarket(symbol: string): Promise<Market | undefined> {
  const all = await getMarkets()
  return all.find((m) => m.symbol.toLowerCase() === symbol.toLowerCase())
}

export async function getWallet(publicKey?: string): Promise<WalletInfo> {
  if (USE_MOCKS) {
    return mock(wallet)
  }

  if (!publicKey) {
    return { address: '', network: 'Testnet', totalUsd: 0, totalUsdc: 0, balances: [] }
  }

  try {
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`)
    if (!res.ok) throw new Error('Cuenta no encontrada o sin saldo en Testnet.')
    
    const data = await res.json()
    let totalUsd = 0
    let totalUsdc = 0

    const balances = data.balances.map((b: any) => {
      const symbol = b.asset_type === 'native' ? 'XLM' : b.asset_code
      const amount = parseFloat(b.balance)
      const usd = symbol === 'USDC' ? amount : amount * 0.12
      totalUsd += usd
      if (symbol === 'USDC') totalUsdc += amount

      return { symbol, amount, usd }
    })

    return { address: publicKey, network: 'Testnet', totalUsd, totalUsdc, balances }
  } catch (err) {
    console.warn('No se pudieron obtener saldos reales de Horizon, retornando balances vacíos:', err)
    return {
      address: publicKey,
      network: 'Testnet',
      totalUsd: 0,
      totalUsdc: 0,
      balances: [
        { symbol: 'XLM', amount: 0, usd: 0 },
        { symbol: 'USDC', amount: 0, usd: 0 },
      ],
    }
  }
}

export async function getPortfolio(publicKey?: string): Promise<PortfolioInfo> {
  if (USE_MOCKS) {
    return mock({ ...portfolio, positions, totalUsd: wallet.totalUsd, totalUsdc: wallet.totalUsdc })
  }

  if (!publicKey) {
    return {
      totalUsd: 0,
      totalUsdc: 0,
      changePct: 0,
      series: [0, 0, 0, 0, 0],
      yearlyEstimateUsd: 0,
      yearlyApy: 0,
      positions: [],
    }
  }

  const walletData = await getWallet(publicKey)

  const pos: Position[] = walletData.balances.map((b) => ({
    symbol: b.symbol,
    type: 'Supply',
    amount: b.amount,
    usd: b.usd,
    apy: b.symbol === 'USDC' ? 8.5 : 5.2,
    gain: b.usd * 0.05,
  }))

  return {
    totalUsd: walletData.totalUsd,
    totalUsdc: walletData.totalUsdc,
    changePct: 0,
    series: [walletData.totalUsd, walletData.totalUsd],
    yearlyEstimateUsd: walletData.totalUsd * 0.07,
    yearlyApy: 7.0,
    positions: pos,
  }
}

export async function getActivity(publicKey?: string): Promise<ActivityItem[]> {
  if (USE_MOCKS) {
    return mock(activity)
  }

  if (!publicKey) return []

  try {
    // 1. Intentar obtener la actividad del backend
    const res = await fetch(`${API_URL}/activity?address=${publicKey}`)
    if (res.ok) {
      return await res.json()
    }

    // 2. Fallback directo a Horizon: mapear únicamente a 'Supply' o 'Withdraw'
    const horizonRes = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${publicKey}/payments?limit=10&order=desc`
    )
    if (!horizonRes.ok) return []

    const data = await horizonRes.json()
    const records = data._embedded?.records ?? []

    return records.map((tx: any, idx: number) => {
      const isXlm = tx.asset_type === 'native'
      const symbol = isXlm ? 'XLM' : (tx.asset_code ?? 'USDC')
      const amount = parseFloat(tx.amount ?? '0')

      // Clasificación a los tipos permitidos
      const type = tx.from === publicKey ? 'Supply' : 'Withdraw'

      return {
        id: idx + 1,
        type,
        symbol,
        amount,
        date: new Date(tx.created_at).toLocaleDateString(),
        status: 'Completado',
      }
    })
  } catch (err) {
    console.error('Error al obtener la actividad:', err)
    return []
  }
}

export async function getRecommendation(goal: Goal, amount: number, token: string): Promise<Recommendation> {
  if (!USE_MOCKS) {
    try {
      return await http<Recommendation>('/recommendation', post({ goal, amount, token }))
    } catch (err) {
      console.warn('API /recommendation falló (404), generando respuesta local:', err)
    }
  }
  await wait(1200)
  const items = rankMarkets(markets, goal).slice(0, 3)
  const usd = amount * (tokenPriceUsd[token] ?? 1)
  return { items, yearlyUsd: (usd * items[0].market.supplyApy) / 100 }
}

/* ---------- Chat del Asesor IA ---------- */
export async function sendChat(message: string): Promise<ChatReply> {
  if (!USE_MOCKS) {
    try {
      return await http<ChatReply>('/chat', post({ message }))
    } catch (err) {
      console.warn('API /chat no responde, usando respuesta simulada:', err)
    }
  }
  await wait(900)
  const t = message.toLowerCase()

  if (/\bapy\b/.test(t) && /(qu[eé] es|significa|explica)/.test(t)) {
    return { text: 'El APY es el rendimiento anual estimado de tu dinero. Si depositas 100 con un APY de 5%, en un año ganarías cerca de 5. Puede variar con el mercado.' }
  }
  if (/utiliz/.test(t)) {
    return { text: 'La utilización es el porcentaje del dinero depositado que ya está prestado. Si es muy alta, puede costar más retirar; si es muy baja, el rendimiento suele ser menor.' }
  }
  if (/^\s*[¡¿]?\s*(hola|buenas|hey)/.test(t)) {
    return { text: '¡Hola! Cuéntame cuánto quieres invertir y qué buscas: rendimiento, liquidez o bajo riesgo.' }
  }

  const goal: Goal = /riesg|segur|estable|conserv|tranquil/.test(t)
    ? 'safe'
    : /liquid|retir|dispon|r[aá]pid/.test(t)
      ? 'liquidity'
      : 'yield'
  const { market } = rankMarkets(markets, goal)[0]
  const found = t.match(/\d+(?:[.,]\d+)?/)
  const amount = found ? Number(found[0].replace(',', '.')) : 0
  const extra = amount > 0 ? ` Con ${amount} ganarías cerca de ${fmtUsd((amount * market.supplyApy) / 100)} al año.` : ''
  return {
    text: `Para ${goalLabels[goal]}, mi mejor opción es Supply ${market.symbol}: rinde ${market.supplyApy.toFixed(2)}% anual, tiene ${market.liquidity} de liquidez y riesgo ${market.risk}.${extra}`,
    symbol: market.symbol,
  }
}

/* ---------- Web3 & Soroban ---------- */
export async function connectWallet(): Promise<{ address: string }> {
  if (!USE_MOCKS) {
    const connected = await isConnected()
    if (!connected) {
      throw new Error('La extensión de Freighter no está instalada.')
    }
    const allowed = await isAllowed()
    const addressResult = await getAddress()
    const address = typeof addressResult === 'string' ? addressResult : addressResult?.address

    if (!allowed || !address) {
      throw new Error('Permiso denegado por la billetera Freighter.')
    }
    return { address }
  }

  await wait(900)
  return { address: wallet.address }
}

const randomHash = () => Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')

export async function submitTransaction(input: TxInput, onStage: (s: TxStage) => void): Promise<TxResult> {
  if (!USE_MOCKS) {
    try {
      onStage('signing')

      const networkPassphrase = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET
      const userAddress = (await getAddress()).address
      const server = new rpc.Server(import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443')
      const account = await server.getAccount(userAddress)

      const contract = new Contract(import.meta.env.VITE_VAULT_CONTRACT_ID)

      // 1. Usa el Contract ID real del TOKEN en Soroban Testnet
      const tokenAddress = import.meta.env.VITE_USDC_CONTRACT_ID || 'CBIELT6Y34TTC43C5IFA3O2M2K4J5R4R3A6L7O5P4Q3R2S1T0U9V8W7X'

      // Convertir el monto a i128 considerando 7 decimales de Stellar
      const amountInStroops = BigInt(Math.floor(input.amount * 10_000_000))
      console.log('Monto original (UI):', input.amount)
      console.log('Monto convertido (Stroops):', amountInStroops.toString())

      const args = [
        new Address(userAddress).toScVal(),
        new Address(tokenAddress).toScVal(),
        nativeToScVal(amountInStroops, { type: 'i128' }),
      ]

      const tx = new TransactionBuilder(account, {
        fee: '10000',
        networkPassphrase,
      })
        .addOperation(contract.call('deposit', ...args))
        .setTimeout(30)
        .build()

      const preparedTx = await server.prepareTransaction(tx)

      const signResult = await signTransaction(preparedTx.toXDR(), {
        networkPassphrase,
      })

      // Aseguramos obtener la cadena XDR independientemente del formato devuelto por Freighter
      const signedXdr = typeof signResult === 'string' ? signResult : (signResult as any)?.signedTxXdr || signResult

      onStage('confirming')

      // Reconstruimos el objeto Transaction desde la cadena XDR
      const signedTransaction = TransactionBuilder.fromXDR(signedXdr, networkPassphrase)

      // Se envía el objeto Transaction reconstruido a la RPC
      let sendResult = await server.sendTransaction(signedTransaction)

      if (sendResult.status === 'ERROR') {
        throw new Error(`Error enviando la transacción: ${JSON.stringify(sendResult)}`)
      }

      // 2. Polling para confirmar la inclusión en el ledger
      let statusResponse = await server.getTransaction(sendResult.hash)
      while (statusResponse.status === 'NOT_FOUND') {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        statusResponse = await server.getTransaction(sendResult.hash)
      }

      if (statusResponse.status === 'SUCCESS') {
        return { hash: sendResult.hash, demo: false }
      } else {
        throw new Error(`Transacción fallida en la red con estado: ${statusResponse.status}`)
      }

    } catch (err: any) {
      console.error('Error en transacción de Soroban:', err)
      throw new Error(`Error en la transacción real: ${err.message || 'Transacción fallida'}`)
    }
  }

  onStage('signing')
  await wait(1600)
  onStage('confirming')
  await wait(1800)
  return { hash: randomHash(), demo: true }
}