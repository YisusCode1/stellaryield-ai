import { useCallback, useEffect, useState } from 'react'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: undefined }))
    fn()
      .then((data) => { if (!cancelled) setState({ data, loading: false }) })
      .catch((e) => { if (!cancelled) setState({ loading: false, error: e instanceof Error ? e.message : 'Ocurrió un error inesperado.' }) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}