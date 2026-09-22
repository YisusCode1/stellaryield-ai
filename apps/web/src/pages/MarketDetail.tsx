import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Hint from '../components/Hint'
import Icon from '../components/Icon'
import Simulator from '../components/Simulator'
import { ErrorBox, Skeleton } from '../components/States'
import TokenIcon from '../components/TokenIcon'
import TxModal from '../components/TxModal'
import WhyPanel from '../components/WhyPanel'
import { useWallet } from '../context/WalletContext'
import { fmtNum, fmtPct } from '../data/mock'
import { useAsync } from '../hooks/useAsync'
import { explain } from '../lib/scoring'
import { getMarket, getWallet } from '../services/api'

type Tab = 'overview' | 'supply' | 'borrow'
const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Vista general' },
  { id: 'supply', label: 'Supply' },
  { id: 'borrow', label: 'Borrow' },
]

export default function MarketDetail() {
  const { symbol = '' } = useParams()
  const wallet = useWallet()

  // Extraer la dirección pública de wallet.publicKey o wallet.address
  const activeAddress = wallet.publicKey ?? wallet.address ?? ''

  const market = useAsync(() => getMarket(symbol), [symbol])

  // Se envía activeAddress a getWallet(...)
  const info = useAsync(
    () => (wallet.status === 'connected' && activeAddress ? getWallet(activeAddress) : Promise.resolve(null)),
    [wallet.status, activeAddress]
  )

  const [tab, setTab] = useState<Tab>('supply')
  const [amount, setAmount] = useState('100')
  const [txOpen, setTxOpen] = useState(false)

  if (market.error) return <ErrorBox message={market.error} onRetry={market.reload} />

  if (market.loading) {
    return (
      <>
        <Skeleton w={140} h={14} />
        <Skeleton h={64} r={14} />
        <Skeleton h={320} r={14} />
      </>
    )
  }

  const m = market.data
  if (!m) {
    return (
      <section className="card empty-state">
        <h1>Mercado no encontrado</h1>
        <p className="muted">No existe un mercado para “{symbol}”.</p>
        <Link className="btn btn-primary" to="/markets">Ver mercados</Link>
      </section>
    )
  }

  // Mapeo defensivo para tolerar camelCase (supplyApy) y snake_case (supply_apy)
  const supplyApy = m.supplyApy ?? (m as any).supply_apy ?? 0
  const borrowApy = m.borrowApy ?? (m as any).borrow_apy ?? 0

  const connected = wallet.status === 'connected'

  // Búsqueda flexible de balances en respuesta directa de Horizon o normalizada
  const balance = (() => {
    if (!info.data) return 0
    const rawBalances = info.data.balances ?? (info.data as any).raw?.balances ?? []
    const found = rawBalances.find((b: any) => {
      const sym = (b.symbol ?? b.asset_code ?? (b.asset_type === 'native' ? 'XLM' : '')).toLowerCase()
      return sym === m.symbol.toLowerCase()
    })
    if (!found) return 0
    return typeof found.amount === 'number' ? found.amount : parseFloat(found.amount ?? found.balance ?? '0')
  })()

  const value = Number(amount)
  const isBorrow = tab === 'borrow'
  const apy = isBorrow ? borrowApy : supplyApy

  const error =
    !amount || Number.isNaN(value) || value <= 0
      ? 'Ingresa un monto mayor a 0.'
      : connected && !isBorrow && value > balance
        ? `Tu balance disponible es ${fmtNum(balance)} ${m.symbol}.`
        : ''

  return (
    <>
      <Link className="link back" to="/markets"><Icon name="back" size={14} /> Volver a mercados</Link>

      <div className="detail-head">
        <div className="asset">
          <TokenIcon symbol={m.symbol} size={44} />
          <span><strong className="h1-sm">{m.symbol}</strong><small>{m.network}</small></span>
        </div>
        <div className="apy-pair">
          <div><small>APY de Supply</small><strong className="green big-sm">{fmtPct(supplyApy)}</strong></div>
          <div><small>APY de Borrow</small><strong className="green big-sm">{fmtPct(borrowApy)}</strong></div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' ? (
        <>
          <section className="card stats-grid">
            <div><small className="muted">Utilización <Hint text="Porcentaje del dinero depositado que ya está prestado." /></small><strong>{m.utilization ?? 0}%</strong></div>
            <div><small className="muted">Liquidez del mercado</small><strong>{m.liquidity ?? '0'}</strong></div>
            <div><small className="muted">Nivel de riesgo</small><strong className="cap">{m.risk ?? 'bajo'}</strong></div>
            <div><small className="muted">Tu balance</small><strong>{connected ? `${fmtNum(balance)} ${m.symbol}` : '—'}</strong></div>
          </section>
          
          {/* Pasar el objeto m normalizado con las propiedades aseguradas */}
          <section className="card">
            <WhyPanel explanation={explain({ ...m, supplyApy, borrowApy }, 'yield')} />
          </section>
        </>
      ) : (  

        <div className="detail-grid">
          <section className="card">
            <h2>{isBorrow ? 'Borrow' : 'Supply'} {m.symbol}</h2>
            <p className="muted">
              {isBorrow
                ? `Pide prestado ${m.symbol} usando tus activos como garantía.`
                : `Deposita tus ${m.symbol} en el mercado de XOXNO y genera rendimiento automáticamente.`}
            </p>
            <div className="mini-stats">
              <div><small>Tu balance disponible</small><strong>{connected ? `${fmtNum(balance)} ${m.symbol}` : '—'}</strong></div>
              <div><small>APY estimado</small><strong className="green">{fmtPct(apy)}</strong></div>
              <div><small>Liquidez del mercado</small><strong>{m.liquidity}</strong></div>
            </div>

            <label className="field-label" htmlFor="amount">Cantidad a {isBorrow ? 'pedir' : 'depositar'}</label>
            <div className="amount-field">
              <input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!error} />
              <span className="unit"><TokenIcon symbol={m.symbol} size={22} />{m.symbol}<Icon name="chevron" size={14} /></span>
            </div>
            {error && <p className="error" role="alert">{error}</p>}

            {connected ? (
              <button className="btn btn-primary btn-block" type="button" disabled={!!error} onClick={() => setTxOpen(true)}>Continuar</button>
            ) : (
              <button className="btn btn-primary btn-block" type="button" disabled={wallet.status === 'connecting'} onClick={() => void wallet.connect()}>
                {wallet.status === 'connecting' ? 'Conectando…' : 'Conectar wallet para continuar'}
              </button>
            )}
          </section>

          <aside className="card summary">
            <h3>Resumen</h3>
            <ul>
              <li><Icon name="check" size={15} /> Red de Stellar Testnet</li>
              <li><Icon name="check" size={15} /> Token: {m.symbol}</li>
              <li><Icon name="check" size={15} /> APY estimado: {fmtPct(apy)}</li>
              <li><Icon name="check" size={15} /> Comisión: 0%</li>
            </ul>
            <p className="note-blue"><Icon name="info" size={15} /> Se creará una transacción en Soroban. Asegúrate de tener tu wallet conectada y saldo de XLM para fees.</p>
          </aside>
        </div>
      )}

      {tab !== 'borrow' && <Simulator key={m.symbol} apy={supplyApy} initialAmount={Number(amount) || 500} />}

      {txOpen && (
        <TxModal input={{ kind: isBorrow ? 'borrow' : 'supply', symbol: m.symbol, amount: value }} apy={apy} onClose={() => setTxOpen(false)} />
      )}
    </>
  )
}