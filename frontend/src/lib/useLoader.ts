import { useEffect, useState } from 'react'

interface LoaderState<T> {
  data: T | null
  error: string | null
  source: { fetcher: () => Promise<T>; nonce: number } | null
}

/**
 * Charge des données à chaque changement de `fetcher` (à mémoriser avec useCallback).
 * loading est déduit (aucun setState synchrone dans l'effet) ; reload() relance le chargement.
 * Pendant un rechargement, les anciennes données restent affichées.
 */
export function useLoader<T>(fetcher: () => Promise<T>) {
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState<LoaderState<T>>({ data: null, error: null, source: null })

  useEffect(() => {
    let alive = true
    const source = { fetcher, nonce }
    fetcher().then(
      (data) => alive && setState({ data, error: null, source }),
      (err: Error) => alive && setState((prev) => ({ ...prev, error: err.message, source })),
    )
    return () => {
      alive = false
    }
  }, [fetcher, nonce])

  const loading = state.source?.fetcher !== fetcher || state.source?.nonce !== nonce
  return { data: state.data, error: state.error, loading, reload: () => setNonce((n) => n + 1) }
}
