// src/hooks/useAutoRefresh.ts
// Rafraîchit automatiquement les données quand :
// - L'utilisateur revient sur l'onglet (visibilitychange)
// - Le téléphone est déverrouillé / l'app repasse au premier plan (focus)
// Aucune dépendance externe requise.

import { useEffect, useRef } from 'react'

interface UseAutoRefreshOptions {
  // Fonction appelée pour rafraîchir les données
  onRefresh: () => void
  // Délai minimum entre deux rafraîchissements (ms). Défaut : 60 secondes.
  // Evite de spammer l'API si l'utilisateur switche rapidement d'onglet.
  minInterval?: number
}

export function useAutoRefresh({ onRefresh, minInterval = 60_000 }: UseAutoRefreshOptions) {
  const lastRefreshAt = useRef<number>(Date.now())
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => { onRefreshRef.current = onRefresh }, [onRefresh])

  useEffect(() => {
    const tryRefresh = () => {
      const now = Date.now()
      if (now - lastRefreshAt.current < minInterval) return
      lastRefreshAt.current = now
      onRefreshRef.current()
    }

    // Cas 1 : l'onglet redevient visible (mobile : retour sur l'app, desktop : retour sur l'onglet)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tryRefresh()
      }
    }

    // Cas 2 : la fenêtre reprend le focus (desktop / tablette)
    const handleFocus = () => tryRefresh()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [minInterval])
}