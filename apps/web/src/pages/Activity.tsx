import { Link } from 'react-router-dom'
import ConnectGate from '../components/ConnectGate'
import { ErrorBox, TableSkeleton } from '../components/States'
import TokenIcon from '../components/TokenIcon'
import { useWallet } from '../context/WalletContext' // 1. Importar useWallet
import { fmtNum } from '../data/mock'
import { useAsync } from '../hooks/useAsync'
import { getActivity } from '../services/api'

function ActivityList() {
  const { publicKey } = useWallet() // 2. Obtener la clave pública del contexto

  // 3. Pasar publicKey a getActivity e incluirlo en las dependencias de useAsync
  const { data, loading, error, reload } = useAsync(
    () => getActivity(publicKey ?? undefined),
    [publicKey]
  )

  if (error) return <ErrorBox message={error} onRetry={reload} />

  if (!loading && (data ?? []).length === 0) {
    return (
      <section className="card empty-state">
        <p className="muted">Aún no tienes transacciones.</p>
        <Link className="btn btn-primary" to="/markets">Explorar mercados</Link>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Activo</th>
              <th>Cantidad</th>
              <th>Fecha</th>
              <th className="right">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableSkeleton rows={3} cols={5} />}
            {(data ?? []).map((a) => (
              <tr key={a.id}>
                <td>{a.type}</td>
                <td>
                  <div className="asset">
                    <TokenIcon symbol={a.symbol} size={28} />
                    <span>{a.symbol}</span>
                  </div>
                </td>
                <td>{fmtNum(a.amount)}</td>
                <td>{a.date}</td>
                <td className="right">
                  <span className="badge badge-green">{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function Activity() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Actividad</h1>
          <p className="muted">Tus últimas transacciones en XOXNO sobre Stellar Testnet.</p>
        </div>
      </div>
      <ConnectGate text="Conecta tu wallet para ver tu historial.">
        <ActivityList />
      </ConnectGate>
    </>
  )
}