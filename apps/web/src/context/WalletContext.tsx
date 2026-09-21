import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { connectWallet } from '../services/api'

type Status = 'disconnected' | 'connecting' | 'connected'
interface WalletCtx {
  status: Status
  address: string | null
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletCtx | null>(null)
const KEY = 'stellaryield:wallet'

const read = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const write = (v: string | null) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY) } catch { /* sin storage */ } }

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(read)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const { address } = await connectWallet()
      setAddress(address)
      write(address)
    } catch (e) {

      setError(e instanceof Error ? e.message : 'No se pudo conectar la wallet.')
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => { setAddress(null); write(null) }, [])

  const status: Status = connecting ? 'connecting' : address ? 'connected' : 'disconnected'
  const value = useMemo(() => ({ status, address, error, connect, disconnect }), [status, address, error, connect, disconnect])
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet debe usarse dentro de <WalletProvider>.')
  return ctx
}