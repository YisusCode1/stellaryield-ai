import Icon from './Icon'

export default function Footer() {
  return (
    <footer className="footer">
      <span className="footer-logo">✦ StellarYield <b>AI</b></span>
      <span className="footer-sep" aria-hidden="true" />
      <span className="muted">Asesor de rendimiento DeFi sobre XOXNO en Stellar</span>
      <span className="footer-sep" aria-hidden="true" />
      <span className="footer-badge"><Icon name="check" size={12} /> Stellar Testnet</span>
      <span className="footer-sep" aria-hidden="true" />
      <span className="muted">Contratos Soroban</span>
      <span className="footer-sep" aria-hidden="true" />
      <span className="muted">Hackathon Stellar 2026</span>
      <span className="footer-sep" aria-hidden="true" />
      <span className="muted">© {new Date().getFullYear()} StellarYield AI</span>
    </footer>
  )
}