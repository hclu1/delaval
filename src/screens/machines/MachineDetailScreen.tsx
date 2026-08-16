// MachineDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ArrowLeft, Edit, MapPin, Calendar, Settings, Wrench, History, Navigation, Target, Cpu, Zap, Clock, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMachines } from '../../hooks/useMachines';
import { useClients } from '../../hooks/useClients';
import { useInterventions } from '../../hooks/useInterventions';
import { useMaintenanceKits } from '../../hooks/useMaintenanceKits';
import { getCurrentPosition, openNavigation } from '../../utils/geoUtils';
import { api } from '../../lib/api';
import { InterventionHistoryCard } from '../../components/domain/InterventionHistoryCard';
import { downloadInterventionPDF } from '../../services/clientPdfService';

interface MachineDetailScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  machineId: string;
  clientId?: string;
  clientView?: boolean; // MODE CLIENT : masque les boutons technicien, active le téléchargement PDF
}

export function MachineDetailScreen({ onNavigate, machineId, clientId, clientView = false }: MachineDetailScreenProps) {
  const { machines, fetchMachines } = useMachines();
  const { clients, fetchClients } = useClients();
  const { interventions, fetchInterventions } = useInterventions();
  const { maintenanceKits, fetchMaintenanceKits } = useMaintenanceKits();

  const [machine, setMachine] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [machineInterventions, setMachineInterventions] = useState<any[]>([]);
  const [machineKits, setMachineKits] = useState<any[]>([]);
  const [geolocating, setGeolocating] = useState(false);
  const [editingVersion, setEditingVersion] = useState(false);
  const [versionNumero, setVersionNumero] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // Navigation dans l'historique photos : clé = index du champ, valeur = index de la photo affichée (0 = la plus récente)
  const [photoHistoryIndex, setPhotoHistoryIndex] = useState<Record<number, number>>({});

  useEffect(() => {
    loadData();
  }, [machineId]);

  // Recharge les données quand l'utilisateur revient sur l'app (smartphone)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [machineId]);

  const loadData = async () => {
    try {
      const machineData = await api.entities.machines.get(machineId);
      setMachine(machineData);

      if (machineData?.clientId) {
        const clientData = await api.entities.clients.get(machineData.clientId);
        setClient(clientData);
      }

      await fetchInterventions({ filter: { machineIds: machineId }, limit: 200 });
      await fetchMaintenanceKits({ limit: 100 });

    } catch (error) {
      console.error('[ERR] Erreur chargement machine:', error);
    }
  };

  useEffect(() => {
    if (machine) {
      const filtered = interventions
        .filter(i => i.machineIds?.includes(machineId))
        .sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime());
      setMachineInterventions(filtered);

      // On ne filtre plus les kits par machineId ici car les kits utilisent machineType
      setMachineKits(maintenanceKits);
    }
  }, [interventions, maintenanceKits, machine, machineId]);

  const openInMaps = () => {
    if (machine?.gpsLat && machine?.gpsLng) {
      openNavigation(parseFloat(machine.gpsLat), parseFloat(machine.gpsLng));
    }
  };

  const handleGeolocateMachine = async () => {
    setGeolocating(true);
    try {
      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      await api.entities.machines.update(machineId, {
        gpsLat: lat.toString(),
        gpsLng: lng.toString(),
        gpsSource: 'FIELD',
        gpsConfirmedAt: new Date().toISOString(),
        lastUpdatedBy: 'system',
        updatedAt: new Date().toISOString()
      });

      alert('✅ Position GPS de la machine enregistrée avec succès !');
      loadData();
} catch (error: any) {
  console.error('Erreur géolocalisation:', error);
  let msg = "❌ Impossible d'obtenir la position GPS.";
  if (error?.code === 1) msg = "❌ Permission refusée.\nAutorisez la géolocalisation dans les paramètres du navigateur.";
  else if (error?.code === 2) msg = "❌ Position indisponible.\nVérifiez que le GPS est activé sur l'appareil.";
  else if (error?.code === 3) msg = "❌ Délai dépassé.\nSignal GPS trop faible, réessayez en extérieur.";
  alert(msg);
} finally {
      setGeolocating(false);
    }
  };

  const handleSaveVersion = async () => {
    try {
      await api.entities.machines.update(machineId, {
        versionNumero: versionNumero,
        updatedAt: new Date().toISOString()
      });
      setEditingVersion(false);
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde version:', error);
      alert('❌ Erreur lors de la sauvegarde du numéro de version');
    }
  };

  // ─── Téléchargement PDF pour le client ───────────────────────────────────────
  const handleDownloadPDF = async (intervention: any) => {
    if (intervention.statut !== 'TERMINEE') {
      alert("ℹ️ Le rapport PDF sera disponible une fois l'intervention terminée.");
      return;
    }
    setDownloadingId(intervention._id);
    try {
      await downloadInterventionPDF(intervention._id);
    } catch (error: any) {
      alert(`❌ Erreur lors de la génération du PDF\n\n${error.message || 'Erreur inconnue'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      REPAIR: 'Dépannage',
      MAINTENANCE: 'Entretien',
      Entretien: 'Entretien',
      INSTALLATION: 'Installation',
      COMMISSIONING: 'Mise en service VMS',
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      REPAIR: '🔧',
      MAINTENANCE: '⚙️',
      Entretien: '⚙️',
      INSTALLATION: '🔨',
      COMMISSIONING: '🚀',
    };
    return icons[type] || '⚙️';
  };

  if (!machine) {
    return (
      <Card className="text-center py-12">
        <p className="text-gray-500">Chargement de la machine...</p>
      </Card>
    );
  }

  const getConfigStyle = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t === 'pump') return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Pompe à vide', icon: <Cpu size={20} /> };
    if (t === 'v300') return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'V300', icon: <Zap size={20} /> };
    return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: type || 'Configuration', icon: <Settings size={20} /> };
  };

  // Interventions terminées uniquement pour la vue client
  const visibleInterventions = clientView
    ? machineInterventions.filter(i => i.statut === 'TERMINEE')
    : machineInterventions;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            onClick={() => clientId ? onNavigate('client-detail', { clientId }) : onNavigate('machines')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Retour
          </Button>

          <div>
            {client && clientId && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span
                  className="hover:text-blue-600 cursor-pointer"
                  onClick={() => onNavigate('client-detail', { clientId })}
                >
                  {client.nom}
                </span>
                <span>›</span>
                <span className="text-gray-700 font-medium">Machine {machine.numeroSerie}</span>
              </div>
            )}
<h1 className="text-3xl font-bold text-gray-900">{machine.nom}</h1>
{machine.machineType && (
  <p className="text-sm text-blue-600 font-medium mt-0.5">{machine.machineType}</p>
)}
<p className="text-gray-600 mt-1">N° de série : {machine.numeroSerie}</p>
            {/* Version N° — masqué en mode client */}
            {!clientView && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-gray-600 text-sm">Version N° :</span>
                {editingVersion ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={versionNumero}
                      onChange={(e) => setVersionNumero(e.target.value)}
                      className="px-2 py-1 border border-blue-300 rounded text-sm w-32 focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 1.0"
                      autoFocus
                    />
                    <button onClick={handleSaveVersion} className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">OK</button>
                    <button onClick={() => { setEditingVersion(false); setVersionNumero(machine.versionNumero || ''); }} className="px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400">X</button>
                  </div>
                ) : (
                  <span onClick={() => { setEditingVersion(true); setVersionNumero(machine.versionNumero || ''); }} className="text-blue-600 font-medium text-sm cursor-pointer hover:underline">
                    {machine.versionNumero || 'Cliquer pour ajouter'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Boutons technicien uniquement */}
        {!clientView && (
          <div className="flex flex-wrap gap-2">
            {machine.gpsLat && machine.gpsLng && (
              <Button variant="secondary" onClick={openInMaps} className="flex items-center gap-2">
                <Navigation size={18} />
                Itinéraire
              </Button>
            )}
            <Button variant="secondary" onClick={handleGeolocateMachine} disabled={geolocating} className="flex items-center gap-2">
              <Target size={18} />
              {geolocating ? 'Géolocalisation...' : 'Géolocaliser'}
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('machine-form', { machineId })} className="flex items-center gap-2">
              <Edit size={18} />
              Modifier
            </Button>
            <Button variant="secondary" onClick={() => onNavigate('maintenance-kit-selection', { machineId })} className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
              <Wrench size={18} />
              Entretien
            </Button>
            <Button variant="primary" onClick={() => onNavigate('intervention-form', { machineId, clientId: machine.clientId })} className="flex items-center gap-2">
              <Wrench size={18} />
              Intervention
            </Button>
          </div>
        )}
      </div>

      {/* ── Infos principales ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Client</h2>
          {client ? (
            <div className="space-y-2">
              <div className={`font-medium ${!clientView ? 'text-blue-600 hover:underline cursor-pointer' : 'text-gray-900'}`}
                onClick={() => !clientView && onNavigate('client-detail', { clientId: client._id })}>
                {client.nom}
              </div>
              <div className="text-gray-600 text-sm">{client.nomFerme}</div>
              <div className="text-sm text-gray-500">{client.ville} ({client.codePostal})</div>
              <div className="text-xs text-gray-500">N° {client.numeroClient}</div>
            </div>
          ) : (
            <p className="text-gray-500">Client non trouvé</p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Dates
          </h2>
          <div className="space-y-3">
            {machine.dateInstallation && (
              <div>
                <div className="text-sm text-gray-600">Installation</div>
                <div className="font-medium">{new Date(machine.dateInstallation).toLocaleDateString('fr-FR')}</div>
              </div>
            )}
            {machine.dateDernierEntretien && (
              <div>
                <div className="text-sm text-gray-600">Dernier entretien</div>
                <div className="font-medium">{new Date(machine.dateDernierEntretien).toLocaleDateString('fr-FR')}</div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={20} />
            Techniques
          </h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">Compteur</div>
              <div className="font-medium text-2xl text-blue-600">{machine.compteur || 0}h</div>
            </div>
            {machine.gpsLat && machine.gpsLng && (
              <div>
                <div className="text-sm text-gray-600 mb-2">GPS</div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  {machine.gpsSource === 'FIELD' ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1"><Target size={12} /> Terrain</span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1"><MapPin size={12} /> Adresse</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Configuration technique ────────────────────────────────────────────── */}
      {machine.configType && (
        <div className={`p-5 rounded-lg border-l-4 ${getConfigStyle(machine.configType)?.bg} ${getConfigStyle(machine.configType)?.border}`}>
          <div className="flex items-center gap-3 mb-4 border-b pb-2 border-gray-200">
            <div className={`p-2 rounded-full bg-white ${getConfigStyle(machine.configType)?.color}`}>
              {getConfigStyle(machine.configType)?.icon}
            </div>
            <h3 className="font-bold text-lg text-gray-900">Configuration Technique : {machine.configType}</h3>
          </div>

          {machine.configType.toLowerCase() === 'pump' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div><div className="text-xs text-gray-500 uppercase font-semibold">Type de Pompe</div><div className="font-medium text-gray-900 text-lg">{machine.pumpType || '-'}</div></div>
                <div><div className="text-xs text-gray-500 uppercase font-semibold">Variateur</div><div className="font-medium text-gray-900 text-lg">{machine.pumpVariator || '-'}</div></div>
                <div><div className="text-xs text-gray-500 uppercase font-semibold">Armoire</div><div className="font-medium text-gray-900 text-lg">{machine.pumpCabinet || '-'}</div></div>
              </div>
              {Array.isArray(machine.pumpExtraFields) && machine.pumpExtraFields.length > 0 && (
                <div className="pt-4 border-t border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-700 mb-3">Détails supplémentaires</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {machine.pumpExtraFields.map((field: any, index: number) => (
                      <div key={index} className="bg-white/60 p-2 rounded border border-blue-100">
                        <div className="text-xs text-gray-500 uppercase font-semibold">{field.label}</div>
                        <div className="font-medium text-gray-800">{field.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {machine.configType.toLowerCase() === 'v300' && (
            <div className="space-y-4">
              <div><div className="text-xs text-gray-500 uppercase font-semibold">Option Principale</div><div className="font-medium text-gray-900 text-lg">{machine.v300Option || '-'}</div></div>
              {Array.isArray(machine.v300ExtraFields) && machine.v300ExtraFields.length > 0 && (
                <div className="pt-4 border-t border-green-200">
                  <h4 className="text-sm font-semibold text-green-700 mb-3">Options supplémentaires</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {machine.v300ExtraFields.map((field: any, index: number) => (
                      <div key={index} className="bg-white/60 p-2 rounded border border-green-100">
                        <div className="text-xs text-gray-500 uppercase font-semibold">{field.label}</div>
                        <div className="font-medium text-gray-800">{field.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!['pump', 'v300'].includes(machine.configType.toLowerCase()) && (
            <div className="space-y-4">
              {machine.otherConfigDetails && (
                <div>
                  <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Description</div>
                  <div className="font-medium text-gray-900 whitespace-pre-wrap">{machine.otherConfigDetails}</div>
                </div>
              )}
              {machine.otherExtraFields && (
                (() => {
                  const parsedOtherExtraFields = Array.isArray(machine.otherExtraFields)
                    ? machine.otherExtraFields
                    : (typeof machine.otherExtraFields === 'string' && machine.otherExtraFields ? JSON.parse(machine.otherExtraFields) : []);
                    
                  if (parsedOtherExtraFields.length === 0) return null;
                  
                  return (
                    <div className="pt-4 border-t border-gray-300">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Caractéristiques techniques</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {parsedOtherExtraFields.map((field: any, index: number) => (
                          <div key={index} className="bg-white/60 p-2 rounded border border-gray-300 shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold">{field.label}</div>
                            <div className="font-medium text-gray-800">{field.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Champs personnalisés (technicien seulement) ───────────────────────── */}
      {!clientView && machine.customFields && (
        (() => {
          const parsedCustomFields = Array.isArray(machine.customFields) 
            ? machine.customFields 
            : (typeof machine.customFields === 'string' && machine.customFields ? JSON.parse(machine.customFields) : []);
            
          if (parsedCustomFields.length === 0) return null;
          
          return (
            <Card>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings size={20} />
                Champs personnalisés
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parsedCustomFields.map((field: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">{field.name}</div>

                {/* ── Champ photo : affichage + historique + prise de photo ── */}
                {field.type === 'photo' ? (
                  <div className="space-y-2">
                    {(() => {
                      // Historique photos : index 0 = la plus récente
                      const history: string[] = [
                        ...(field.value ? [field.value] : []),
                        ...(field.photoHistory || []),
                      ].slice(0, 3);
                      // Historique dates en parallèle
                      const historyDates: string[] = [
                        ...(field.photoDate ? [field.photoDate] : []),
                        ...(field.photoHistoryDates || []),
                      ].slice(0, 3);
                      const currentIdx = photoHistoryIndex[index] ?? 0;
                      const displayedPhoto = history[currentIdx] || null;
                      const displayedDate = historyDates[currentIdx] || null;
                      const total = history.length;

                      // Formate la date ISO en "DD/MM/YYYY HH:MM"
                      const formatDate = (iso: string) => {
                        const d = new Date(iso);
                        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                      };

                      return (
                        <>
                          {/* Zone image */}
                          <div className="relative">
                            {displayedPhoto ? (
                              <img
                                src={displayedPhoto}
                                alt={field.name}
                                className="w-full h-40 object-cover rounded border border-gray-200 cursor-pointer"
                                onClick={() => window.open(displayedPhoto, '_blank')}
                              />
                            ) : (
                              <div className="w-full h-40 bg-gray-200 rounded border border-dashed border-gray-400 flex items-center justify-center text-gray-400 text-sm">
                                Aucune photo
                              </div>
                            )}
                            {/* Indicateur de position (sur l'image, visible si historique > 1) */}
                            {total > 1 && (
                              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
                                {total - currentIdx}/{total}
                              </div>
                            )}
                          </div>

                          {/* Flèches navigation — toujours visibles dès qu'il y a une photo */}
                          {total >= 1 && (
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                disabled={currentIdx >= total - 1}
                                onClick={() => setPhotoHistoryIndex(prev => ({ ...prev, [index]: currentIdx + 1 }))}
                                className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                                title="Photo précédente (plus ancienne)"
                              >
                                <ChevronLeft size={18} />
                              </button>
                              <span className="text-xs text-gray-400 flex-1 text-center">
                                {total > 1 ? `Photo ${total - currentIdx} / ${total}` : 'Photo actuelle'}
                              </span>
                              <button
                                type="button"
                                disabled={currentIdx <= 0}
                                onClick={() => setPhotoHistoryIndex(prev => ({ ...prev, [index]: currentIdx - 1 }))}
                                className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                                title="Photo suivante (plus récente)"
                              >
                                <ChevronRight size={18} />
                              </button>
                            </div>
                          )}

                          {/* Ligne : date à gauche | bouton à droite */}
                          <div className="flex items-center gap-2">
                            {/* Date de la photo affichée */}
                            <span className="text-xs text-gray-400 flex-1 truncate">
                              {displayedDate ? formatDate(displayedDate) : ''}
                            </span>

                            {/* Bouton prendre/changer photo */}
                            <label className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors shrink-0">
                              📷 {field.value ? 'Changer' : 'Prendre une photo'}
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;

                                  // Compression via canvas avant sauvegarde (évite dépassement limite Lumi)
                                  const compressImage = (file: File): Promise<string> =>
                                    new Promise((resolve, reject) => {
                                      const img = new Image();
                                      const url = URL.createObjectURL(file);
                                      img.onload = () => {
                                        URL.revokeObjectURL(url);
                                        const MAX = 800;
                                        let { width, height } = img;
                                        if (width > MAX || height > MAX) {
                                          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
                                          else { width = Math.round(width * MAX / height); height = MAX; }
                                        }
                                        const canvas = document.createElement('canvas');
                                        canvas.width = width;
                                        canvas.height = height;
                                        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                                        resolve(canvas.toDataURL('image/jpeg', 0.7));
                                      };
                                      img.onerror = reject;
                                      img.src = url;
                                    });

                                  try {
                                    const base64 = await compressImage(file);
                                    const now = new Date().toISOString();
                                    const updatedFields = machine.customFields.map((f: any, i: number) => {
                                      if (i !== index) return f;
                                      // Archiver l'ancienne photo + sa date, limité à 2 entrées (+ actuelle = 3 max)
                                      const prevHistory: string[] = f.photoHistory || [];
                                      const prevDates: string[] = f.photoHistoryDates || [];
                                      const newHistory = (f.value ? [f.value, ...prevHistory] : prevHistory).slice(0, 2);
                                      const newDates = (f.photoDate ? [f.photoDate, ...prevDates] : prevDates).slice(0, 2);
                                      return { ...f, value: base64, photoDate: now, photoHistory: newHistory, photoHistoryDates: newDates };
                                    });
                                    await api.entities.machines.update(machineId, {
                                      customFields: updatedFields,
                                      updatedAt: new Date().toISOString()
                                    });
                                    setPhotoHistoryIndex(prev => ({ ...prev, [index]: 0 }));
                                    loadData();
                                  } catch (err: any) {
                                    console.error('Erreur sauvegarde photo:', err);
alert('❌ Impossible de sauvegarder la photo' + (err?.message ? '\n' + err.message : ''));                                  }
                                }}
                              />
                            </label>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                ) : field.type === 'boolean' ? (
                  <div className="font-medium text-gray-800">
                    {field.value === 'true' ? 'Oui' : 'Non'}
                  </div>

                ) : (
                  <div className="font-medium text-gray-800">{field.value}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
        );
      })()
    )}


      {/* ── Historique des interventions ──────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <History size={20} />
            {clientView
              ? `Rapports d'intervention (${visibleInterventions.length})`
              : `Historique (${machineInterventions.length})`}
          </h2>
        </div>

        {/* ── VUE CLIENT : liste des interventions terminées + bouton PDF ─────── */}
        {clientView ? (
          visibleInterventions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune intervention terminée</p>
          ) : (
            <div className="space-y-3">
              {visibleInterventions.map((intervention) => (
                <div
                  key={intervention._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(intervention.type)}</span>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {getTypeLabel(intervention.type)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {intervention.dateDebut
                          ? new Date(intervention.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : 'Date inconnue'}
                        {intervention.numeroIntervention && ` · N° ${intervention.numeroIntervention}`}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => handleDownloadPDF(intervention)}
                    disabled={downloadingId === intervention._id}
                    className="flex items-center gap-2 shrink-0"
                  >
                    {downloadingId === intervention._id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Télécharger PDF
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── VUE TECHNICIEN : InterventionHistoryCard classique ─────────────── */
          machineInterventions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune intervention</p>
          ) : (
            <div className="space-y-3">
              {machineInterventions.slice(0, 10).map((intervention) => (
                <InterventionHistoryCard
                  key={intervention._id}
                  intervention={intervention}
                  onNavigate={onNavigate}
                  showClient={true}
                  showMachine={false}
                />
              ))}

              {machineInterventions.length > 10 && (
                <Button variant="ghost" className="w-full" onClick={() => onNavigate('interventions', { machineId })}>
                  Voir toutes les interventions ({machineInterventions.length})
                </Button>
              )}
            </div>
          )
        )}
      </Card>

      {/* ── Stats ─────────────────────────────────────────────────────────────── */}
      <div className={`grid gap-4 ${clientView ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <Card className="text-center">
          <div className="text-3xl font-bold text-blue-600">{machineInterventions.length}</div>
          <div className="text-sm text-gray-600 mt-1">Interventions</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {machineInterventions.filter(i => i.statut === 'TERMINEE').length}
          </div>
          <div className="text-sm text-gray-600 mt-1">Terminées</div>
        </Card>
        {!clientView && (
          <>
            <Card className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {machineInterventions.filter(i => i.statut === 'EN_COURS').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">En cours</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-purple-600">{machineKits.length}</div>
              <div className="text-sm text-gray-600 mt-1">Kits</div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}