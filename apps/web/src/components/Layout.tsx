import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Icon from './Icon'
import { Brand, PoweredBy } from './Logo'
import { useWallet } from '../context/WalletContext'
import { fmtAddr } from '../data/mock'
import Footer from './Footer'

const nav = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/markets', label: 'Mercados', icon: 'bars' },
  { to: '/portfolio', label: 'Mi Portafolio', icon: 'wallet' },
  { to: '/advisor', label: 'Asesor IA', icon: 'spark' },
  { to: '/activity', label: 'Actividad', icon: 'clock' },
]

const KEY = 'stellaryield:sidebar'
const readOpen = () => { try { return localStorage.getItem(KEY) !== 'closed' } catch { return true } }

export default function Layout() {
  // Usamos publicKey del contexto y la asignamos a address
  const { status, publicKey: address, connect, disconnect } = useWallet()
  const [open, setOpen] = useState(readOpen)

  const toggle = () => {
    setOpen((v) => {
      try { localStorage.setItem(KEY, v ? 'closed' : 'open') } catch { /* sin storage */ }
      return !v
    })
  }

  return (
    <div className={`shell${open ? '' : ' collapsed'}`}>
      <aside className="sidebar" id="sidebar" inert={!open}>
        <Brand />
        <nav aria-label="Principal">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <PoweredBy />
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-toggle" type="button" onClick={toggle} aria-expanded={open} aria-controls="sidebar" aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="chip"><i className="dot" />Stellar Testnet</span>

          {/* Si está conectado y existe address/publicKey, muestra la dirección recortada */}
          {status === 'connected' && address ? (
            <>
              <span className="chip"><Icon name="wallet" size={15} />{fmtAddr(address)}</span>
              <button className="link-btn link" type="button" onClick={disconnect}>Desconectar</button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" type="button" disabled={status === 'connecting'} onClick={() => void connect()}>
              {status === 'connecting' ? <><span className="spinner-sm" aria-hidden="true" /> Conectando…</> : 'Conectar wallet'}
            </button>
          )}

          <span className="avatar" aria-label="Perfil">
            {address ? address.slice(0, 1) : 'G'}
          </span>
        </header>

        <main className="content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}