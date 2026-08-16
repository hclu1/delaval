//useInterventionGPS.ts
import { useState, useEffect, useRef } from 'react';
import { 
  getCurrentPosition, 
  watchPosition, 
  clearWatch, 
  isNearMachine, 
  isTooFarFromMachine 
} from '../utils/geoUtils';

interface GPSEvent {
  type: 'START' | 'PAUSE' | 'RESUME' | 'END';
  timestamp: string;
  lat: number;
  lng: number;
  distance?: number;
}

interface UseInterventionGPSOptions {
  machineId: string;
  machineLat: number;
  machineLng: number;
  onAutoStart?: () => void;
  onAutoPause?: (distance: number) => void;
  onAutoResume?: () => void;
  proximityThreshold?: number; // défaut: 50m
  distanceThreshold?: number; // défaut: 200m
}

export function useInterventionGPS({
  machineId,
  machineLat,
  machineLng,
  onAutoStart,
  onAutoPause,
  onAutoResume,
  proximityThreshold = 50,
  distanceThreshold = 200
}: UseInterventionGPSOptions) {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [events, setEvents] = useState<GPSEvent[]>([]);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);

  // Démarrer la surveillance GPS
  const startTracking = () => {
    if (watchIdRef.current !== null) return;

    try {
      const watchId = watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setCurrentPosition({ lat, lng });

          // Auto-démarrage si proche de la machine
          if (!hasAutoStarted && !isTracking) {
            if (isNearMachine(lat, lng, machineLat, machineLng, proximityThreshold)) {
              setHasAutoStarted(true);
              addEvent('START', lat, lng);
              onAutoStart?.();
            }
          }

          // Gestion des pauses/reprises si intervention en cours
          if (isTracking) {
            const tooFar = isTooFarFromMachine(lat, lng, machineLat, machineLng, distanceThreshold);
            
            if (tooFar && !isPaused) {
              // Pause automatique
              const distance = Math.round(
                Math.sqrt(
                  Math.pow(lat - machineLat, 2) + Math.pow(lng - machineLng, 2)
                ) * 111000 // Approximation km -> m
              );
              setIsPaused(true);
              addEvent('PAUSE', lat, lng, distance);
              onAutoPause?.(distance);
            } else if (!tooFar && isPaused) {
              // Reprise automatique
              setIsPaused(false);
              addEvent('RESUME', lat, lng);
              onAutoResume?.();
            }
          }
        },
        (error) => {
          console.error('Erreur GPS tracking:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.code === 1 ? 'Accès GPS refusé par l\'utilisateur' : '',
            POSITION_UNAVAILABLE: error.code === 2 ? 'Position GPS indisponible' : '',
            TIMEOUT: error.code === 3 ? 'Timeout GPS' : ''
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 5000
        }
      );

      watchIdRef.current = watchId;
      setIsTracking(true);
    } catch (error) {
      console.error('Erreur démarrage tracking GPS:', {
        error,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        name: error instanceof Error ? error.name : 'Unknown'
      });
    }
  };

  // Arrêter la surveillance GPS
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (currentPosition) {
      addEvent('END', currentPosition.lat, currentPosition.lng);
    }
    
    setIsTracking(false);
    setIsPaused(false);
  };

  // Ajouter un événement GPS
  const addEvent = (type: GPSEvent['type'], lat: number, lng: number, distance?: number) => {
    const event: GPSEvent = {
      type,
      timestamp: new Date().toISOString(),
      lat,
      lng,
      distance
    };
    setEvents(prev => [...prev, event]);
  };

  // Démarrer manuellement (force le démarrage même si pas à proximité)
  const manualStart = async () => {
    try {
      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      setCurrentPosition({ lat, lng });
      setHasAutoStarted(true);
      addEvent('START', lat, lng);
      startTracking();
    } catch (error) {
      const errorDetails = {
        error,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        name: error instanceof Error ? error.name : 'Unknown',
        isGeolocationError: error instanceof GeolocationPositionError,
        code: error instanceof GeolocationPositionError ? error.code : undefined
      };
      console.error('Erreur démarrage manuel:', errorDetails);
      
      // Fallback: utiliser position approximative si timeout
      if (error instanceof GeolocationPositionError && error.code === 3) {
        console.warn('GPS timeout - démarrage avec position approximative');
        setCurrentPosition({ lat: machineLat, lng: machineLng });
        setHasAutoStarted(true);
        addEvent('START', machineLat, machineLng);
        startTracking();
        return;
      }
      
      throw error;
    }
  };

  // Clôturer l'intervention
  const endIntervention = () => {
    stopTracking();
  };

  // Nettoyage
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    isPaused,
    currentPosition,
    events,
    hasAutoStarted,
    startTracking,
    stopTracking,
    manualStart,
    endIntervention
  };
}
