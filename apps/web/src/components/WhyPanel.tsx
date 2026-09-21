import type { Explanation } from '../lib/scoring'

export default function WhyPanel({ explanation }: { explanation: Explanation }) {
  return (
    <div className="why">
      <div className="why-head">
        <strong>¿Por qué esta opción?</strong>
        <span className="badge badge-green">{explanation.total}/100</span>
      </div>
      <ul>
        {explanation.factors.map((f) => (
          <li key={f.key}>
            <div className="why-row"><span>{f.label}</span><small>{f.detail}</small></div>
            <div className="why-track" role="meter" aria-label={f.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={f.score}>
              <div className="why-fill" style={{ width: `${f.score}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <small className="why-foot">Puntaje calculado con el rendimiento, la liquidez, el riesgo y el uso del mercado. Es una estimación, no una garantía.</small>
    </div>
  )
}