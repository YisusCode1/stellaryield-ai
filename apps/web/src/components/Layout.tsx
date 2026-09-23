import { useEffect, useState, useSyncExternalStore } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Icon from './Icon'
import { Brand, PoweredBy } from './Logo'
import { useWallet } from '../context/WalletContext'
import { fmtAddr } from '../data/mock'

const nav = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/markets', label: 'Mercados', icon: 'bars' },
  { to: '/portfolio', label: 'Mi Portafolio', icon: 'wallet' },
  { to: '/advisor', label: 'Asesor IA', icon: 'spark' },
  { to: '/activity', label: 'Actividad', icon: 'clock' },
]

// Escucha un media query y se actualiza al girar o cambiar el tamaño de la pantalla
function useMedia(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', notify)
      return () => m.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

const KEY = 'stellaryield:sidebar'
const readOpen = () => { try { return localStorage.getItem(KEY) !== 'closed' } catch { return true } }

export default function Layout() {
  const { status, address, connect, disconnect } = useWallet()
  const mobile = useMedia('(max-width: 760px)') // celular: barra de navegación inferior
  const narrow = useMedia('(max-width: 1024px)') // tablet: menú como panel deslizable
  const [wideOpen, setWideOpen] = useState(readOpen) // escritorio: abierto/cerrado (se recuerda)
  const [drawer, setDrawer] = useState(false) // tablet: panel abierto/cerrado

  const drawerOpen = narrow && !mobile && drawer
  const open = narrow ? drawer : wideOpen

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const toggle = () => {
    if (narrow) { setDrawer((v) => !v); return }
    setWideOpen((v) => {
      try { localStorage.setItem(KEY, v ? 'closed' : 'open') } catch { /* sin storage */ }
      return !v
    })
  }

  return (
    <div className={`shell${!narrow && !wideOpen ? ' collapsed' : ''}`}>
      <aside className={`sidebar${drawerOpen ? ' drawer-open' : ''}`} id="sidebar" inert={!mobile && !open}>
        <Brand />
        <nav aria-label="Principal">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setDrawer(false)} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <PoweredBy />
      </aside>
      {drawerOpen && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

      <div className="main">
        <header className="topbar">
          <button className="menu-toggle" type="button" onClick={toggle} aria-expanded={open} aria-controls="sidebar" aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="chip"><i className="dot" />Stellar Testnet</span>
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
          <span className="avatar" aria-label="Perfil">G</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}