import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { fmtPct } from '../data/mock'
import { submitTransaction } from '../services/api'
import type { TxInput } from '../services/api'

type Phase = 'review' | 'signing' | 'confirming' | 'done' | 'error'
const STEPS = ['Revisar', 'Firmar en wallet', 'Confirmando', 'Listo']
const INDEX = { review: 0, signing: 1, confirming: 2, done: 3 } as const

export default function TxModal({ input, apy, onClose }: { input: TxInput; apy: number; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('review')
  const [progress, setProgress] = useState(0)
  const [hash, setHash] = useState('')
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState('')
  const mainBtn = useRef<HTMLButtonElement>(null)

  const busy = phase === 'signing' || phase === 'confirming'
  const label = input.kind === 'supply' ? 'Supply' : 'Borrow'

  const go = (p: Exclude<Phase, 'error'>) => { setPhase(p); setProgress(INDEX[p]) }

  const run = async () => {
    go('signing')
    try {
      const res = await submitTransaction(input, (s) => go(s))
      setHash(res.hash)
      setDemo(!!res.demo)
      go('done')
    } catch (e) {

      setError(e instanceof Error ? e.message : 'No se pudo completar la transacción.')
      setPhase('error')
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  useEffect(() => { mainBtn.current?.focus() }, [phase])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="tx-title">
        <div className="modal-head">
          <h2 id="tx-title">{label} {input.symbol}</h2>
          <button className="icon-btn" type="button" aria-label="Cerrar" disabled={busy} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <ol className="tx-steps" aria-label="Progreso de la transacción">
          {STEPS.map((s, i) => {
            const state = phase === 'error' && i === progress ? 'failed' : i < progress || phase === 'done' ? 'done' : i === progress ? 'current' : ''
            return (
              <li key={s} className={state}>
                <span>{state === 'done' ? <Icon name="check" size={12} /> : state === 'failed' ? '!' : i + 1}</span>{s}
              </li>
            )
          })}
        </ol>


        {phase === 'review' && (
          <>
            <dl className="tx-summary">
              <div><dt>Acción</dt><dd>{label}</dd></div>
              <div><dt>Monto</dt><dd>{input.amount} {input.symbol}</dd></div>
              <div><dt>APY estimado</dt><dd className="green">{fmtPct(apy)}</dd></div>
              <div><dt>Red</dt><dd>Stellar Testnet</dd></div>
              <div><dt>Comisión</dt><dd>0% + fee de red</dd></div>
            </dl>
            <button ref={mainBtn} className="btn btn-primary btn-block" type="button" onClick={() => void run()}>Confirmar y firmar</button>
          </>
        )}

        {busy && (
          <div className="tx-wait" role="status">
            <span className="spinner" aria-hidden="true" />
            <strong>{phase === 'signing' ? 'Esperando tu firma…' : 'Confirmando en la red…'}</strong>
            <p className="muted">{phase === 'signing' ? 'Aprueba la transacción en tu wallet.' : 'Esto suele tardar unos segundos. No cierres esta ventana.'}</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="tx-wait" role="status">
            <span className="tx-ok"><Icon name="check" size={26} /></span>
            <strong>¡Listo! Tu {label.toLowerCase()} de {input.amount} {input.symbol} se confirmó.</strong>
            <p className="muted hash">{hash.slice(0, 10)}…{hash.slice(-8)}</p>
            {demo && <p className="muted">Modo demo: la transacción es simulada y no existe en el explorador.</p>}
            <a className="link" href={`https://stellar.expert/explorer/testnet/tx/${hash}`} target="_blank" rel="noreferrer">
              Ver en el explorador <Icon name="external" size={13} />
            </a>
            <div className="tx-actions">
              <Link className="btn btn-primary btn-sm" to="/portfolio" onClick={onClose}>Ver mi portafolio</Link>

              <button ref={mainBtn} className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Cerrar</button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="tx-wait" role="alert">
            <strong className="error-title">No se pudo completar</strong>
            <p className="muted">{error}</p>
            <div className="tx-actions">
              <button ref={mainBtn} className="btn btn-primary btn-sm" type="button" onClick={() => { setPhase('review'); setProgress(0) }}>Intentar de nuevo</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}