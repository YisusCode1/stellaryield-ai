// Capa de servicios: las pantallas SOLO llaman a estas funciones.
// Modo demo (por defecto): devuelven datos de ejemplo con retraso simulado.
// Modo real: pon VITE_USE_MOCKS=false en .env y se llama a la API (VITE_API_URL).
import { activity, fmtUsd, markets, portfolio, positions, tokenPriceUsd, wallet } from '../data/mock'
import type { Market } from '../data/mock'
import { goalLabels, rankMarkets } from '../lib/scoring'
import type { Goal, RankedMarket } from '../lib/scoring'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/* ---------- Tipos (este es el "contrato" con el backend) ---------- */
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

/* ---------- Lecturas ---------- */
export const getMarkets = (): Promise<Market[]> => (USE_MOCKS ? mock(markets) : http('/markets'))

export async function getMarket(symbol: string): Promise<Market | undefined> {
  const all = await getMarkets()
  return all.find((m) => m.symbol.toLowerCase() === symbol.toLowerCase())
}

export const getWallet = (): Promise<WalletInfo> => (USE_MOCKS ? mock(wallet) : http('/wallet'))

export const getPortfolio = (): Promise<PortfolioInfo> =>
  USE_MOCKS
    ? mock({ ...portfolio, positions, totalUsd: wallet.totalUsd, totalUsdc: wallet.totalUsdc })

    : http('/portfolio')

export const getActivity = (): Promise<ActivityItem[]> => (USE_MOCKS ? mock(activity) : http('/activity'))

export async function getRecommendation(goal: Goal, amount: number, token: string): Promise<Recommendation> {
  if (!USE_MOCKS) return http('/recommendation', post({ goal, amount, token }))
  await wait(1200)
  const items = rankMarkets(markets, goal).slice(0, 3)
  const usd = amount * (tokenPriceUsd[token] ?? 1)
  return { items, yearlyUsd: (usd * items[0].market.supplyApy) / 100 }
}

/* ---------- Chat del asesor ---------- */
export async function sendChat(message: string): Promise<ChatReply> {
  if (!USE_MOCKS) return http('/chat', post({ message }))
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

/* ---------- Wallet y transacciones (los conecta el equipo de blockchain) ---------- */
export async function connectWallet(): Promise<{ address: string }> {
  if (!USE_MOCKS) {
    // TODO (equipo blockchain): reemplazar por Freighter / Stellar Wallets Kit y devolver la dirección real.
    throw new Error('Conexión de wallet real pendiente de implementar.')
  }
  await wait(900)
  return { address: wallet.address }
}

const randomHash = () => Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')

export async function submitTransaction(input: TxInput, onStage: (s: TxStage) => void): Promise<TxResult> {
  if (!USE_MOCKS) {
    // TODO (equipo blockchain): construir, firmar con la wallet y enviar a Soroban. Llamar onStage en cada etapa.
    onStage('signing')
    return http('/transactions', post(input))
  }
  onStage('signing')
  await wait(1600)
  if (input.amount === 666) throw new Error('La wallet rechazó la firma.') // truco para probar el estado de error

  onStage('confirming')
  await wait(1800)
  return { hash: randomHash(), demo: true }
}