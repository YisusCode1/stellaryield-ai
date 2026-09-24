import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Hint from '../components/Hint'
import Icon from '../components/Icon'
import { ErrorBox, TableSkeleton } from '../components/States'
import TokenIcon from '../components/TokenIcon'
import UtilBar from '../components/UtilBar'
import { fmtPct } from '../lib/format'
import { useAsync } from '../hooks/useAsync'
import { getMarkets } from '../services/api'

const filters = ['Todos', 'USDC', 'XLM', 'Otros'] as const
type Filter = (typeof filters)[number]

export default function Markets() {
  const { data, loading, error, reload } = useAsync(getMarkets)
  const [filter, setFilter] = useState<Filter>('Todos')
  const [query, setQuery] = useState('')

  const rows = useMemo(
    () =>
      (data ?? []).filter((m) => {
        const byFilter = filter === 'Todos' ? true : filter === 'Otros' ? !['USDC', 'XLM'].includes(m.symbol) : m.symbol === filter
        return byFilter && m.symbol.toLowerCase().includes(query.trim().toLowerCase())
      }),
    [data, filter, query],
  )

  return (
    <>
      <div className="page-head">
        <div>

          <h1>Mercados</h1>
          <p className="muted">Explora los mercados de XOXNO y encuentra la mejor oportunidad para tus activos en Stellar.</p>
        </div>
        <label className="search">
          <input type="search" placeholder="Buscar activo..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar activo" />
          <Icon name="search" size={16} />
        </label>
      </div>

      <div className="tabs" role="tablist" aria-label="Filtrar por activo">
        {filters.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={`tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>APY de Supply <Hint text="Rendimiento anual estimado que ganas por depositar tu dinero." /></th>
                  <th>APY de Borrow <Hint text="Costo anual estimado de pedir prestado este activo." /></th>
                  <th>Utilización <Hint text="Porcentaje del dinero depositado que ya está prestado." /></th>
                  <th>Liquidez <Hint text="Cuánto dinero hay disponible para retirar en este mercado." /></th>
                  <th className="right">Acciones</th>
                </tr>
              </thead>
              <tbody>

                {loading && <TableSkeleton rows={4} cols={6} />}
                {!loading && rows.map((m) => (
                  <tr key={m.symbol}>
                    <td><div className="asset"><TokenIcon symbol={m.symbol} /><span>{m.symbol}<small>{m.network}</small></span></div></td>
                    <td className="green">{fmtPct(m.supplyApy)}</td>
                    <td className="green">{fmtPct(m.borrowApy)}</td>
                    <td><UtilBar value={m.utilization} variant="pill" /></td>
                    <td>{m.liquidity}</td>
                    <td className="right"><Link className="btn btn-primary btn-sm" to={`/markets/${m.symbol}`}>Supply <Icon name="arrow" size={14} /></Link></td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={6} className="empty">No hay mercados que coincidan. Prueba con otro nombre o filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="note"><Icon name="info" size={16} /> Los datos de mercado son proporcionados por XOXNO y se actualizan en tiempo real.
            <a className="link" href="https://xoxno.com" target="_blank" rel="noreferrer">XOXNO SDK <Icon name="external" size={13} /></a></p>
        </section>
      )}
    </>
  )
}
