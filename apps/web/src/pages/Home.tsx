import { useState } from 'react'
import { Link } from 'react-router-dom'
import ConnectGate from '../components/ConnectGate'
import CountUp from '../components/CountUp'
import Hint from '../components/Hint'
import Icon from '../components/Icon'
import { ErrorBox, Skeleton, TableSkeleton } from '../components/States'
import TokenIcon from '../components/TokenIcon'
import UtilBar from '../components/UtilBar'
import WhyPanel from '../components/WhyPanel'
import { useWallet } from '../context/WalletContext'
import { fmtNum, fmtPct, fmtUsd } from '../data/mock'
import { useAsync } from '../hooks/useAsync'
import { riskLabels } from '../lib/scoring'
import { getMarkets, getRecommendation, getWallet } from '../services/api'

function BalanceCard() {
  const { publicKey } = useWallet()
  
  // Re-ejecuta la llamada a getWallet cuando cambia el estado de publicKey
  const { data: w, loading, error, reload } = useAsync(
    () => getWallet(publicKey ?? undefined),
    [publicKey]
  )

  if (error) return <ErrorBox message={error} onRetry={reload} />

  return (
    <section className="card balance-card">
      <div>
        <p className="muted">Tu saldo total</p>
        {loading || !w ? (
          <div className="stack">
            <Skeleton w={170} h={38} />
            <Skeleton w={110} h={14} />
          </div>
        ) : (
          <>
            <p className="big">
              <CountUp value={w.totalUsd} format={fmtUsd} />
            </p>
            <p className="muted">≈ {fmtNum(w.totalUsdc)} USDC</p>
          </>
        )}
      </div>

      {loading || !w ? (
        <Skeleton h={92} r={12} />
      ) : (
        <ul className="balance-list">
          {w.balances.map((b) => (
            <li key={b.symbol}>
              <TokenIcon symbol={b.symbol} size={30} />
              <span className="sym">
                {b.symbol}
                <small>Stellar</small>
              </span>
              <span className="amt">
                {fmtNum(b.amount)}
                <small>≈ {fmtUsd(b.usd)}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RecommendationCard() {
  const { data, loading, error, reload } = useAsync(() => getRecommendation('safe', 100, 'USDC'))
  const [why, setWhy] = useState(false)

  if (error) return <ErrorBox message={error} onRetry={reload} />

  if (loading || !data) {
    return (
      <section className="card rec-card" aria-busy="true">
        <Skeleton w="55%" h={16} />
        <Skeleton w="75%" h={22} />
        <Skeleton h={14} />
        <Skeleton w={140} h={40} />
      </section>
    )
  }

  const { market, explanation } = data.items[0]
  return (
    <section className="card rec-card">
      <div className="rec-head">
        <span><Icon name="spark" size={16} /> Recomendación de la IA</span>
        <span className="badge badge-green">{riskLabels[market.risk]}</span>
      </div>
      <div className="rec-title">
        <TokenIcon symbol={market.symbol} size={32} />
        <strong>Supply {market.symbol} en XOXNO</strong>
      </div>
      <p className="muted">Opción estable con buen rendimiento y bajo riesgo en el mercado de {market.symbol}.</p>
      <button className="link link-btn" type="button" aria-expanded={why} onClick={() => setWhy((v) => !v)}>
        ¿Por qué esta opción? <Icon name="chevron" size={14} />
      </button>
      {why && <WhyPanel explanation={explanation} />}
      <div className="rec-foot">
        <div>
          <small className="muted">APY estimado</small>
          <div className="apy">{fmtPct(market.supplyApy)}</div>
        </div>
        <Link className="btn btn-primary" to={`/markets/${market.symbol}`}>
          Ver detalles <Icon name="arrow" size={16} />
        </Link>
      </div>
    </section>
  )
}

export default function Home() {
  const { data, loading, error, reload } = useAsync(getMarkets)
  const featured = (data ?? []).slice(0, 2)

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>
            <span className="grad">Hola,</span>
            <br />
            Tu dinero también puede
            <br />
            <span className="grad">trabajar para ti.</span>
          </h1>
          <p>StellarYield AI analiza el mercado y te recomienda las mejores oportunidades de rendimiento en la red Stellar.</p>
        </div>
        <video
          src="/hero-animation.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{
            maxWidth: '450px',
            width: '100%',
            aspectRatio: '16 / 9',
            objectFit: 'cover',
            borderRadius: '5px',
            WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
          }}
        />
      </section>

      <div className="grid-2">
        <ConnectGate text="Conecta tu wallet para ver tu saldo y tus activos.">
          <BalanceCard />
        </ConnectGate>
        <RecommendationCard />
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <section className="card">
          <div className="card-head">
            <h2>Mercados destacados <span className="muted">(XOXNO)</span></h2>
            <Link className="link" to="/markets">Ver todos <Icon name="arrow" size={14} /></Link>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>APY de Supply <Hint text="Rendimiento anual estimado que ganas por depositar tu dinero." /></th>
                  <th>APY de Borrow <Hint text="Costo anual estimado de pedir prestado este activo." /></th>
                  <th>Utilización <Hint text="Porcentaje del dinero depositado que ya está prestado." /></th>
                  <th className="right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && <TableSkeleton rows={2} cols={5} />}
                {!loading && featured.map((m) => (
                  <tr key={m.symbol}>
                    <td>
                      <div className="asset">
                        <TokenIcon symbol={m.symbol} />
                        <span>{m.symbol}<small>{m.network}</small></span>
                      </div>
                    </td>
                    <td className="green">{fmtPct(m.supplyApy)}</td>
                    <td className="green">{fmtPct(m.borrowApy)}</td>
                    <td><UtilBar value={m.utilization} /></td>
                    <td className="right">
                      <Link className="btn btn-primary btn-sm" to={`/markets/${m.symbol}`}>
                        Supply <Icon name="arrow" size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}