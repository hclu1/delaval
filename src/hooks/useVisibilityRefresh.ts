// useVisibilityRefresh.ts
// Rappelle le callback fourni chaque fois que l'utilisateur revient sur l'app
// (changement d'onglet, retour depuis l'écran d'accueil sur smartphone, etc.)
import { useEffect, useRef } from 'react';

/**
 * @param callback  Fonction à appeler au retour sur l'app (ex: loadData, fetchClients...)
 * @param deps      Dépendances React (comme useEffect) — passer [] si le callback est stable
 */
export function useVisibilityRefresh(callback: () => void, deps: any[] = []) {
  // On stocke le callback dans une ref pour éviter de recréer le listener à chaque render
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}