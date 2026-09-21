import ConnectGate from '../components/ConnectGate'
import CountUp from '../components/CountUp'
import Icon from '../components/Icon'
import Sparkline from '../components/Sparkline'
import { ErrorBox, Skeleton } from '../components/States'
import TokenIcon from '../components/TokenIcon'
import { fmtNum, fmtPct, fmtUsd } from '../data/mock'
import { useAsync } from '../hooks/useAsync'
import { getPortfolio } from '../services/api'

function PortfolioContent() {
  const { data: p, loading, error, reload } = useAsync(getPortfolio)
  if (error) return <ErrorBox message={error} onRetry={reload} />

  if (loading || !p) {
    return (
      <>
        <Skeleton h={250} r={14} />
        <Skeleton h={190} r={14} />
        <Skeleton h={110} r={14} />
      </>
    )
  }

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <p className="muted">Balance total</p>
            <p className="big"><CountUp value={p.totalUsd} format={fmtUsd} /></p>
            <p className="muted">≈ {fmtNum(p.totalUsdc)} USDC</p>
          </div>
          <span className="badge badge-green">+{p.changePct}% (7 días)</span>
        </div>
        <Sparkline data={p.series} />
      </section>

      <section className="card">
        <h2>Mis posiciones</h2>
        {p.positions.length === 0 ? (
          <p className="muted empty">Aún no tienes posiciones. Explora los mercados para empezar.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Activo / Tipo</th><th>Cantidad</th><th>APY</th><th className="right">Ganancia</th></tr></thead>
              <tbody>
                {p.positions.map((x) => (
                  <tr key={x.symbol}>
                    <td><div className="asset"><TokenIcon symbol={x.symbol} /><span>{x.symbol}<small>{x.type}</small></span></div></td>
                    <td>{fmtNum(x.amount)}<small className="sub">≈ {fmtUsd(x.usd)}</small></td>
                    <td className="green">{fmtPct(x.apy)}</td>
                    <td className="right green">+{fmtUsd(x.gain)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card estimate">
        <div>
          <p className="muted">Rendimiento total estimado (anual)</p>
          <p className="big"><CountUp value={p.yearlyEstimateUsd} format={fmtUsd} /></p>
          <p className="muted">≈ {fmtPct(p.yearlyApy)} APY</p>
        </div>
        <span className="rocket"><Icon name="rocket" size={34} /></span>
      </section>
    </>
  )
}

export default function Portfolio() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mi Portafolio</h1>
          <p className="muted">Tu posición actual en XOXNO y el rendimiento de tus activos.</p>
        </div>
      </div>
      <ConnectGate text="Conecta tu wallet para ver tus posiciones y ganancias."><PortfolioContent /></ConnectGate>
    </>
  )
}