import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { sendChat } from '../services/api'

interface Msg { id: number; role: 'user' | 'ai'; text: string; symbol?: string }

const SUGGESTIONS = [
  'Tengo 100 USDC y quiero ganar sin arriesgar mucho',
  'Necesito poder retirar mi dinero rápido',
  '¿Qué es el APY?',
]

export default function AdvisorChat() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 0, role: 'ai', text: 'Hola, soy tu asesor de StellarYield. Cuéntame cuánto quieres invertir y qué buscas: rendimiento, liquidez o bajo riesgo.' },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const log = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [msgs, sending])

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text || sending) return
    setInput('')
    setMsgs((m) => [...m, { id: nextId.current++, role: 'user', text }])
    setSending(true)

    try {
      const reply = await sendChat(text)
      setMsgs((m) => [...m, { id: nextId.current++, role: 'ai', text: reply.text, symbol: reply.symbol }])
    } catch {
      setMsgs((m) => [...m, { id: nextId.current++, role: 'ai', text: 'No pude responder ahora. Intenta de nuevo en unos segundos.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="card chat">
      <div className="chat-log" ref={log} role="log" aria-live="polite" aria-label="Conversación con el asesor">
        {msgs.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            <p>{m.text}</p>
            {m.symbol && (
              <Link className="btn btn-primary btn-sm" to={`/markets/${m.symbol}`}>Ver Supply {m.symbol}</Link>
            )}
          </div>
        ))}
        {sending && (
          <div className="bubble ai typing" role="status" aria-label="El asesor está escribiendo">
            <i /><i /><i />
          </div>
        )}
      </div>

      {msgs.length === 1 && (
        <div className="chat-suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="tab" onClick={() => void send(s)}>{s}</button>

          ))}
        </div>
      )}

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); void send(input) }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu pregunta…" aria-label="Mensaje para el asesor" />
        <button className="btn btn-primary" type="submit" disabled={sending || !input.trim()} aria-label="Enviar"><Icon name="send" size={16} /></button>
      </form>
    </section>
  )
}