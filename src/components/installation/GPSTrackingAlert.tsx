// GPSTrackingAlert.tsx
import React, { useEffect, useState } from 'react';
import {AlertTriangle, MapPin, Clock, CheckCircle} from 'lucide-react';
import { useInterventionGPS } from '../../hooks/useInterventionGPS';

interface GPSTrackingAlertProps {
  machineId: string;
  machineLat: number;
  machineLng: number;
  techniciens: Array<{
    id: string;
    nom: string;
    taches: Array<{ heures: number }>;
  }>;
  currentUserId: string;
  onClose?: () => void;
}

export function GPSTrackingAlert({
  machineId,
  machineLat,
  machineLng,
  techniciens,
  currentUserId,
  onClose
}: GPSTrackingAlertProps) {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [heuresJour, setHeuresJour] = useState(0);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  // Calculer les heures totales du technicien connecté aujourd'hui
  const calculerHeuresJour = () => {
    const techActuel = techniciens.find(t => t.id === currentUserId);
    if (!techActuel) return 0;

    const total = techActuel.taches.reduce((sum, tache) => sum + (tache.heures || 0), 0);
    return total;
  };

  // Hook GPS avec callbacks
  const {
    isTracking,
    isPaused,
    currentPosition,
    events,
    manualStart,
    endIntervention
  } = useInterventionGPS({
    machineId,
    machineLat,
    machineLng,
    onAutoStart: () => {
      console.log('🟢 GPS: Arrivé sur le chantier');
    },
    onAutoPause: (distance) => {
      // Technicien s'éloigne de plus de 200m
      const heures = calculerHeuresJour();
      setHeuresJour(heures);

      if (heures < 8 && !isAlertDismissed) {
        setAlertMessage(
          `⚠️ Vous vous éloignez du chantier (${distance}m) mais vous n'avez enregistré que ${heures.toFixed(1)}h sur 8h minimum aujourd'hui.`
        );
        setShowAlert(true);
      }
    },
    onAutoResume: () => {
      console.log('🟢 GPS: Retour sur le chantier');
      setShowAlert(false);
    },
    proximityThreshold: 50,   // 50m pour détecter l'arrivée
    distanceThreshold: 200    // 200m pour déclencher l'alerte
  });

  // Démarrer le tracking GPS au montage du composant
  useEffect(() => {
    manualStart().catch(err => {
      console.error('Erreur démarrage GPS:', err);
    });

    return () => {
      endIntervention();
    };
  }, []);

  // Recalculer les heures quand les tâches changent
  useEffect(() => {
    const heures = calculerHeuresJour();
    setHeuresJour(heures);
  }, [techniciens, currentUserId]);

  const handleDismissAlert = () => {
    setIsAlertDismissed(true);
    setShowAlert(false);
  };

  const handleConfirmReturn = () => {
    setShowAlert(false);
  };

  return (
    <>
      {/* Indicateur GPS en haut de l'écran */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg ${
          isPaused 
            ? 'bg-orange-100 border border-orange-300' 
            : isTracking 
              ? 'bg-green-100 border border-green-300'
              : 'bg-gray-100 border border-gray-300'
        }`}>
          <MapPin 
            size={16} 
            className={isPaused ? 'text-orange-600' : isTracking ? 'text-green-600' : 'text-gray-600'}
          />
          <span className={`text-xs font-semibold ${
            isPaused ? 'text-orange-700' : isTracking ? 'text-green-700' : 'text-gray-700'
          }`}>
            {isPaused ? 'Hors chantier' : isTracking ? 'Sur le chantier' : 'GPS inactif'}
          </span>
          
          {/* Badge heures du jour */}
          <div className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
            heuresJour >= 8 
              ? 'bg-green-200 text-green-800' 
              : 'bg-yellow-200 text-yellow-800'
          }`}>
            <Clock size={12} className="inline mr-1" />
            {heuresJour.toFixed(1)}h / 8h
          </div>
        </div>
      </div>

      {/* Popup d'alerte */}
      {showAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="text-orange-600" size={24} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  ⚠️ Heures insuffisantes
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {alertMessage}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                💡 <strong>Rappel :</strong> Chaque technicien doit enregistrer au minimum 8 heures de travail par jour sur le chantier.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDismissAlert}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
              >
                Ignorer
              </button>
              <button
                onClick={handleConfirmReturn}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
