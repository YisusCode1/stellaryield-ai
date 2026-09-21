import { useState } from 'react'
import { Link } from 'react-router-dom'
import AdvisorChat from '../components/AdvisorChat'
import Icon from '../components/Icon'
import Simulator from '../components/Simulator'
import TokenIcon from '../components/TokenIcon'
import WhyPanel from '../components/WhyPanel'
import { fmtPct, fmtUsd, tokenPriceUsd } from '../data/mock'
import { goalLabels } from '../lib/scoring'
import type { Goal } from '../lib/scoring'
import { getRecommendation } from '../services/api'
import type { Recommendation } from '../services/api'

const goals: { id: Goal; title: string; text: string; icon: string }[] = [
  { id: 'yield', title: 'Rendimiento', text: 'Maximizar tus ganancias con un riesgo moderado.', icon: 'trend' },
  { id: 'liquidity', title: 'Liquidez', text: 'Tener acceso a tus fondos cuando lo necesites.', icon: 'drop' },
  { id: 'safe', title: 'Bajo riesgo', text: 'Priorizar la seguridad de tus fondos.', icon: 'shield' },
]
const steps = ['Objetivo', 'Análisis', 'Recomendación']

export default function Advisor() {
  const [mode, setMode] = useState<'guided' | 'chat'>('guided')
  const [goal, setGoal] = useState<Goal>('yield')
  const [amount, setAmount] = useState('100')
  const [token, setToken] = useState('USDC')
  const [step, setStep] = useState(1)
  const [rec, setRec] = useState<Recommendation | null>(null)
  const [error, setError] = useState('')

  const value = Number(amount)
  const invalid = !amount || Number.isNaN(value) || value <= 0


  const analyze = async () => {
    setError('')
    setStep(2)
    try {
      setRec(await getRecommendation(goal, value, token))
      setStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo analizar la estrategia.')
      setStep(1)
    }
  }

  const top = rec?.items[0]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Asesor de IA</h1>
          <p className="muted">Cuéntanos tus objetivos y te recomendaremos la mejor estrategia.</p>
        </div>
        <div className="tabs" role="tablist" aria-label="Modo del asesor">
          <button role="tab" aria-selected={mode === 'guided'} className={`tab${mode === 'guided' ? ' active' : ''}`} onClick={() => setMode('guided')}>Guiado</button>
          <button role="tab" aria-selected={mode === 'chat'} className={`tab${mode === 'chat' ? ' active' : ''}`} onClick={() => setMode('chat')}>Chat</button>
        </div>
      </div>

      {mode === 'chat' && <AdvisorChat />}

      {mode === 'guided' && (
        <>
          <ol className="stepper" aria-label="Progreso">

            {steps.map((s, i) => (
              <li key={s} className={step === i + 1 ? 'current' : step > i + 1 ? 'done' : ''} aria-current={step === i + 1 ? 'step' : undefined}>
                <span>{step > i + 1 ? <Icon name="check" size={13} /> : i + 1}</span>{s}
              </li>
            ))}
          </ol>

          {step === 1 && (
            <section className="card">
              <h2>¿Qué estás buscando?</h2>
              <div className="goal-grid" role="radiogroup" aria-label="Objetivo">
                {goals.map((g) => (
                  <button key={g.id} type="button" role="radio" aria-checked={goal === g.id} className={`goal${goal === g.id ? ' active' : ''}`} onClick={() => setGoal(g.id)}>
                    <span className="goal-icon"><Icon name={g.icon} size={20} /></span>
                    <strong>{g.title}</strong>
                    <small>{g.text}</small>
                  </button>
                ))}
              </div>

              <label className="field-label" htmlFor="invest">Monto aproximado a invertir</label>
              <div className="amount-field">
                <input id="invest" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={invalid} />
                <select value={token} onChange={(e) => setToken(e.target.value)} aria-label="Token">
                  <option>USDC</option>
                  <option>XLM</option>
                </select>
              </div>
              {invalid && <p className="error" role="alert">Ingresa un monto mayor a 0.</p>}
              {error && <p className="error" role="alert">{error}</p>}
              <button className="btn btn-primary btn-block" type="button" disabled={invalid} onClick={() => void analyze()}>
                Analizar estrategia <Icon name="arrow" size={16} />

              </button>
            </section>
          )}

          {step === 2 && (
            <section className="card analyzing" role="status">
              <span className="spinner" aria-hidden="true" />
              <h2>Analizando mercados…</h2>
              <p className="muted">Comparando APY, liquidez y riesgo de los mercados de XOXNO.</p>
            </section>
          )}

          {step === 3 && rec && top && (
            <>
              <section className="card">
                <h2>Estrategia recomendada</h2>
                <p className="muted">
                  Según tu objetivo ({goalLabels[goal]}) y un monto de {amount} {token}, estas son tus mejores opciones en XOXNO.
                </p>
                <ul className="reco-list">
                  {rec.items.map((it, i) => (
                    <li key={it.market.symbol} className={i === 0 ? 'top' : ''}>
                      <div className="asset">
                        <TokenIcon symbol={it.market.symbol} />
                        <span>Supply {it.market.symbol}<small>Puntaje {it.explanation.total}/100 · Liquidez {it.market.liquidity}</small></span>
                      </div>
                      <strong className="green">{fmtPct(it.market.supplyApy)}</strong>
                      <Link className="btn btn-primary btn-sm" to={`/markets/${it.market.symbol}`}>Ver detalles <Icon name="arrow" size={14} /></Link>
                    </li>
                  ))}
                </ul>
                <p className="note-blue"><Icon name="info" size={15} /> Con la primera opción ganarías cerca de {fmtUsd(rec.yearlyUsd)} al año. Es una estimación y el APY puede variar.</p>

                <button className="btn btn-ghost" type="button" onClick={() => setStep(1)}>Cambiar objetivo</button>
              </section>

              <section className="card"><WhyPanel explanation={top.explanation} /></section>
              <Simulator apy={top.market.supplyApy} initialAmount={value * (tokenPriceUsd[token] ?? 1)} />
            </>
          )}
        </>
      )}
    </>
  )
}