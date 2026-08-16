// src/utils/geoUtils.ts
// Calcul de distance GPS (formule Haversine)

/** Options communes de géolocalisation pour getCurrentPosition et watchPosition */
const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 5000
};

/**
 * Calcule la distance entre deux points GPS en mètres
 * @param lat1 Latitude du premier point
 * @param lng1 Longitude du premier point
 * @param lat2 Latitude du deuxième point
 * @param lng2 Longitude du deuxième point
 * @returns Distance en mètres
 */
export function calculerDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // rayon de la Terre en mètres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Obtient la position GPS actuelle de l'appareil
 * @returns Promise avec la position géographique
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La géolocalisation n\'est pas supportée par ce navigateur'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      GPS_OPTIONS
    );
  });
}

/**
 * Ouvre l'application de navigation (Google Maps ou Waze) avec les coordonnées spécifiées
 * @param lat Latitude de destination
 * @param lng Longitude de destination
 */
export function openNavigation(lat: number, lng: number): void {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Sur mobile, ouvrir l'app native de navigation
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  } else {
    // Sur desktop, ouvrir Google Maps dans un nouvel onglet
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  }
}

/**
 * Surveille la position GPS en continu
 * @param successCallback Callback appelé à chaque mise à jour de position
 * @param errorCallback Callback appelé en cas d'erreur
 * @returns ID du watch pour pouvoir l'arrêter
 */
export function watchPosition(
  successCallback: (position: GeolocationPosition) => void,
  errorCallback?: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    throw new Error('La géolocalisation n\'est pas supportée par ce navigateur');
  }
  
  return navigator.geolocation.watchPosition(
    successCallback,
    errorCallback,
    GPS_OPTIONS
  );
}

/**
 * Arrête la surveillance GPS
 * @param watchId ID retourné par watchPosition
 */
export function clearWatch(watchId: number): void {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Vérifie si une position est proche d'une machine
 * @param lat Latitude actuelle
 * @param lng Longitude actuelle
 * @param machineLat Latitude de la machine
 * @param machineLng Longitude de la machine
 * @param threshold Seuil de proximité en mètres (défaut: 50m)
 * @returns true si la distance est inférieure au seuil
 */
export function isNearMachine(
  lat: number,
  lng: number,
  machineLat: number,
  machineLng: number,
  threshold: number = 50
): boolean {
  const distance = calculerDistance(lat, lng, machineLat, machineLng);
  return distance <= threshold;
}

/**
 * Vérifie si une position est trop éloignée d'une machine
 * @param lat Latitude actuelle
 * @param lng Longitude actuelle
 * @param machineLat Latitude de la machine
 * @param machineLng Longitude de la machine
 * @param threshold Seuil de distance en mètres (défaut: 200m)
 * @returns true si la distance est supérieure au seuil
 */
export function isTooFarFromMachine(
  lat: number,
  lng: number,
  machineLat: number,
  machineLng: number,
  threshold: number = 200
): boolean {
  const distance = calculerDistance(lat, lng, machineLat, machineLng);
  return distance > threshold;
}

/**
 * Géocode une adresse en coordonnées GPS
 * @param address Adresse complète à géocoder
 * @returns Promise avec les coordonnées {lat, lng} ou null si échec
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Utilisation de l'API de géocodage Nominatim (OpenStreetMap)
    const encodedAddress = encodeURIComponent(address);
const response = await fetch(
  `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
  { headers: { 'User-Agent': 'Soplanelevage/1.0' } }
);
    
    if (!response.ok) {
      console.error('Erreur lors du géocodage:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors du géocodage de l\'adresse:', error);
    return null;
  }
}
