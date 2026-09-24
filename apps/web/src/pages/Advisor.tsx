import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import TokenIcon from '../components/TokenIcon'
import { fmtPct, fmtUsd } from '../lib/format'
import { goalLabels } from '../lib/scoring'
import type { Goal } from '../lib/scoring'
import { getRecommendation } from '../services/api'
import type { Recommendation } from '../services/api'

const goals: { id: Goal; title: string; text: string; icon: string }[] = [
  { id: 'yield', title: 'Rendimiento', text: 'Maximizar ganancias asumiendo el riesgo del mercado.', icon: 'trend' },
  { id: 'liquidity', title: 'Liquidez', text: 'Priorizar disponibilidad de fondos en el mercado.', icon: 'drop' },
  { id: 'safe', title: 'Bajo riesgo', text: 'Preferir métricas de utilización más conservadoras.', icon: 'shield' },
]
const steps = ['Objetivo', 'Análisis', 'Recomendación']

export default function Advisor() {
  const [goal, setGoal] = useState<Goal>('yield')
  const [amount, setAmount] = useState('100')
  const [token, setToken] = useState('USDC')
  const [step, setStep] = useState(1)
  const [rec, setRec] = useState<Recommendation | null>(null)
  const [error, setError] = useState('')
  const value = Number(amount)
  const invalid = !amount || !Number.isFinite(value) || value <= 0

  const analyze = async () => {
    setError('')
    setStep(2)
    try {
      setRec(await getRecommendation(goal, value, token))
      setStep(3)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo analizar la estrategia con datos de XOXNO.')
      setStep(1)
    }
  }

  const recommendation = rec?.recommendation
  const market = rec?.market
  const canSupply = recommendation?.status === 'recommended' && market !== undefined

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Asesor de IA</h1>
          <p className="muted">Analiza únicamente el snapshot actual de mercados XOXNO en Stellar Testnet. No firma ni mueve fondos.</p>
        </div>
      </div>

      <ol className="stepper" aria-label="Progreso">
        {steps.map((label, index) => (
          <li key={label} className={step === index + 1 ? 'current' : step > index + 1 ? 'done' : ''} aria-current={step === index + 1 ? 'step' : undefined}>
            <span>{step > index + 1 ? <Icon name="check" size={13} /> : index + 1}</span>{label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section className="card">
          <h2>¿Qué estás buscando?</h2>
          <div className="goal-grid" role="radiogroup" aria-label="Objetivo">
            {goals.map((item) => (
              <button key={item.id} type="button" role="radio" aria-checked={goal === item.id} className={`goal${goal === item.id ? ' active' : ''}`} onClick={() => setGoal(item.id)}>
                <span className="goal-icon"><Icon name={item.icon} size={20} /></span>
                <strong>{item.title}</strong><small>{item.text}</small>
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="invest">Monto a analizar</label>
          <div className="amount-field">
            <input id="invest" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={invalid} />
            <select value={token} onChange={(event) => setToken(event.target.value)} aria-label="Activo"><option>USDC</option></select>
          </div>
          <p className="muted">El monto se convierte a USD usando el precio actual entregado por XOXNO antes de solicitar la recomendación.</p>
          {invalid && <p className="error" role="alert">Ingresa un monto mayor a 0.</p>}
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" type="button" disabled={invalid} onClick={() => void analyze()}>Analizar estrategia <Icon name="arrow" size={16} /></button>
        </section>
      )}

      {step === 2 && <section className="card analyzing" role="status"><span className="spinner" aria-hidden="true" /><h2>Analizando mercados reales…</h2><p className="muted">Consultando APY, liquidez y utilización actuales en XOXNO.</p></section>}

      {step === 3 && recommendation && (
        <section className="card">
          <h2>{canSupply ? 'Estrategia recomendada' : 'Sin recomendación operable'}</h2>
          <p className="muted">Objetivo: {goalLabels[goal]}. Generada: {new Date(recommendation.generatedAt).toLocaleString()}.</p>
          {canSupply && market ? (
            <div className="reco-list"><div className="top"><div className="asset"><TokenIcon symbol={market.symbol} /><span>Supply {market.symbol}<small>Mercado XOXNO Testnet</small></span></div><strong className="green">{fmtPct(recommendation.currentSupplyApyPercent)}</strong><Link className="btn btn-primary btn-sm" to={`/markets/${market.symbol}`}>Ver detalles <Icon name="arrow" size={14} /></Link></div></div>
          ) : <p className="error">Los datos actuales no cumplen el criterio de seguridad del asesor. No se preparará ninguna transacción.</p>}
          {rec.yearlyUsd !== undefined && <p className="note-blue"><Icon name="info" size={15} /> Al APY actual, el cálculo anual aproximado es {fmtUsd(rec.yearlyUsd)}. El APY puede cambiar.</p>}
          <h3>Motivos</h3><ul>{recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          {recommendation.cautions.length > 0 && <><h3>Riesgos y límites</h3><ul>{recommendation.cautions.map((caution) => <li key={caution}>{caution}</li>)}</ul></>}
          <p className="muted">{recommendation.disclaimer}</p>
          <button className="btn btn-ghost" type="button" onClick={() => setStep(1)}>Cambiar objetivo</button>
        </section>
      )}
    </>
  )
}
