import { useState } from 'react'
import ConnectGate from '../components/ConnectGate'
import CountUp from '../components/CountUp'
import Icon from '../components/Icon'
import { ErrorBox, Skeleton } from '../components/States'
import TokenIcon from '../components/TokenIcon'
import TxModal from '../components/TxModal'
import { useWallet } from '../context/WalletContext' // 1. Importar useWallet
import { fmtNum, fmtPct, fmtUsd } from '../lib/format'
import { useAsync } from '../hooks/useAsync'
import { getPortfolio } from '../services/api'
import type { Position, TxInput } from '../services/api'

function PortfolioContent() {
  const { publicKey } = useWallet() // 2. Obtener la clave pública del contexto
  const [withdraw, setWithdraw] = useState<TxInput | null>(null)

  // 3. Pasar publicKey a getPortfolio e incluirlo en las dependencias de useAsync
  const { data: p, loading, error, reload } = useAsync(
    () => getPortfolio(publicKey ?? undefined),
    [publicKey]
  )

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
            <p className="muted">Valor de posiciones en XOXNO Testnet</p>
          </div>
          <span className="badge badge-green">APY variable</span>
        </div>
      </section>

      <section className="card">
        <h2>Mis posiciones</h2>
        {p.positions.length === 0 ? (
          <p className="muted empty">Aún no tienes posiciones. Explora los mercados para empezar.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Activo / Tipo</th><th>Cantidad</th><th>APY</th><th>Estimación anual</th><th className="right">Acción</th></tr></thead>
              <tbody>
                {p.positions.map((x) => (
                  <tr key={`${x.accountNonce}:${x.assetAddress}:${x.hubId}:${x.spokeId}`}>
                    <td><div className="asset"><TokenIcon symbol={x.symbol} /><span>{x.symbol}<small>{x.type}</small></span></div></td>
                    <td>{fmtNum(x.amount)}<small className="sub">≈ {fmtUsd(x.usd)}</small></td>
                    <td className="green">{fmtPct(x.apy)}</td>
                    <td className="green">{fmtUsd(x.yearlyEstimateUsd)}</td>
                    <td className="right">
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setWithdraw(withdrawInput(x))}>Retirar todo</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card estimate">
        <div>
          <p className="muted">Rendimiento estimado anual al APY actual</p>
          <p className="big"><CountUp value={p.yearlyEstimateUsd} format={fmtUsd} /></p>
          <p className="muted">≈ {fmtPct(p.yearlyApy)} APY</p>
        </div>
        <span className="rocket"><Icon name="rocket" size={34} /></span>
      </section>
      {withdraw && <TxModal input={withdraw} apy={p.positions.find((position) => position.accountNonce === withdraw.accountNonce && position.assetAddress === withdraw.assetAddress)?.apy ?? 0} onClose={() => setWithdraw(null)} onSuccess={reload} />}
    </>
  )
}

const withdrawInput = (position: Position): TxInput => ({
  kind: 'withdraw',
  symbol: position.symbol,
  amount: position.amount,
  assetAddress: position.assetAddress,
  hubId: position.hubId,
  spokeId: position.spokeId,
  // XOXNO's full-withdraw sentinel avoids rounding down the live, accrued balance.
  decimals: position.decimals,
  accountNonce: position.accountNonce,
  withdrawAll: true,
})

export default function Portfolio() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mi Portafolio</h1>
          <p className="muted">Tu posición actual en XOXNO y el rendimiento de tus activos.</p>
        </div>
      </div>
      <ConnectGate text="Conecta tu wallet para ver tus posiciones y ganancias.">
        <PortfolioContent />
      </ConnectGate>
    </>
  )
}
