import { useState } from 'react'
import CountUp from './CountUp'
import Hint from './Hint'
import { fmtUsd } from '../data/mock'

const W = 600
const H = 150

export default function Simulator({ apy, initialAmount = 500 }: { apy: number; initialAmount?: number }) {
  const [amount, setAmount] = useState(Math.min(5000, Math.max(50, Math.round(initialAmount / 50) * 50)))
  const [months, setMonths] = useState(12)

  const monthly = apy / 100 / 12
  const valueAt = (m: number) => amount * Math.pow(1 + monthly, m)
  const final = valueAt(months)
  const gain = final - amount

  const pts = Array.from({ length: months + 1 }, (_, m) => {
    const x = (m / months) * W
    const y = H - 8 - ((valueAt(m) - amount) / (final - amount || 1)) * (H - 24)
    return `${x.toFixed(1)} ${y.toFixed(1)}`
  })
  const line = 'M' + pts.join(' L')

  return (
    <section className="card sim">
      <div className="sim-head">
        <h2>Simulador de ganancias <Hint text="Estima cuánto crecería tu dinero con el APY actual, sumando el interés cada mes." /></h2>
        <span className="badge badge-green">APY {apy.toFixed(2)}%</span>
      </div>

      <div className="sim-controls">

        <label>
          <span>Monto: <strong>{fmtUsd(amount)}</strong></span>
          <input type="range" min={50} max={5000} step={50} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </label>
        <label>
          <span>Plazo: <strong>{months} {months === 1 ? 'mes' : 'meses'}</strong></span>
          <input type="range" min={1} max={24} step={1} value={months} onChange={(e) => setMonths(Number(e.target.value))} />
        </label>
      </div>

      <div className="sim-result">
        <div>
          <small>Tendrías</small>
          <strong className="big"><CountUp value={final} format={fmtUsd} /></strong>
          <span className="green">+<CountUp value={gain} format={fmtUsd} /> de ganancia</span>
        </div>
        <div className="sim-vs">
          <small>Sin invertir</small>
          <strong>{fmtUsd(amount)}</strong>
        </div>
      </div>

      <svg className="sim-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Proyección de tu dinero en el tiempo">
        <defs>
          <linearGradient id="simfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2fe0a5" stopOpacity=".35" />
            <stop offset="1" stopColor="#2fe0a5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#simfill)" />
        <line x1="0" x2={W} y1={H - 8} y2={H - 8} stroke="#5a648f" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
        <path d={line} fill="none" stroke="#2fe0a5" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />

      </svg>
      <small className="why-foot">Proyección con el APY actual. El rendimiento real puede variar.</small>
    </section>
  )
}