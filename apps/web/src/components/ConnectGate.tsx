import type { ReactNode } from 'react'
import { useWallet } from '../context/WalletContext'
import Icon from './Icon'

export default function ConnectGate({ children, text = 'Conecta tu wallet para ver esta información.' }: { children: ReactNode; text?: string }) {
  const { status, connect, error } = useWallet()
  if (status === 'connected') return <>{children}</>

  return (
    <section className="card gate">
      <span className="rocket"><Icon name="wallet" size={28} /></span>
      <h2>Conecta tu wallet</h2>
      <p className="muted">{text}</p>
      <button className="btn btn-primary" type="button" disabled={status === 'connecting'} onClick={() => void connect()}>
        {status === 'connecting' ? 'Conectando…' : 'Conectar wallet'}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  )
}