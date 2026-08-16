// InterventionFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ArrowLeft, Save, MapPin, Clock, Play, Pause, StopCircle, Plus, X, Search, Package, FileText } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useMachines } from '../../hooks/useMachines';
import { useInterventions } from '../../hooks/useInterventions';
import { useSpareParts } from '../../hooks/useSpareParts';
import { INTERVENTION_TYPES } from '../../constants';
import { useInterventionGPS } from '../../hooks/useInterventionGPS';
import { getCurrentPosition } from '../../utils/geoUtils';
import { api } from '../../lib/api';
import { ErrorCodeSearchModal } from '../../components/common/ErrorCodeSearchModal';
import { generateInterventionPDF } from '../../utils/pdfGenerator';
import { sendClientInterventionNotification } from '../../services/clientNotificationService'; // AJOUT
import { useAuth } from '../../hooks/useAuth';

interface InterventionFormScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  interventionId?: string;
  clientId?: string;
  machineId?: string;
  maintenanceSelectionData?: any;
  readOnly?: boolean;
  returnTo?: string;
  returnParams?: any;
}

export function InterventionFormScreen({
  onNavigate,
  interventionId,
  clientId,
  machineId,
  maintenanceSelectionData,
  readOnly = false,
  returnTo = 'interventions',
  returnParams = {}
}: InterventionFormScreenProps) {
  console.log('🔍 [FORM] readOnly reçu:', readOnly);
  // ✅ AUTH & PERMISSIONS
  const { hasPermission } = useAuth();

  const { clients, fetchClients } = useClients();
  const { machines, fetchMachines } = useMachines();
  const { createIntervention, updateIntervention } = useInterventions();
  const { spareParts, fetchSpareParts } = useSpareParts();

  // États Modal
  const [isErrorCodeModalOpen, setIsErrorCodeModalOpen] = useState(false);
  const [errorCodeInput, setErrorCodeInput] = useState('');

  type InterventionType = 'REPAIR' | 'MAINTENANCE' | 'INSTALLATION' | 'COMMISSIONING';
  type StatutType = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

  // ✅ LOGIQUE DE DÉTERMINATION DU TYPE PAR DÉFAUT
  const getDefaultType = (): InterventionType => {
    if (hasPermission('create_interventions_repair')) return 'REPAIR';
    if (hasPermission('create_interventions_maintenance')) return 'MAINTENANCE';
    if (hasPermission('create_interventions_installation')) return 'INSTALLATION';
    if (hasPermission('create_interventions_commissioning')) return 'COMMISSIONING';
    return 'REPAIR'; // Fallback
  };

  const [formData, setFormData] = useState<{
    type: InterventionType;
    clientId: string;
    machineIds: string[];
    technicienId: string;
    statut: StatutType;
    dateDebut: string;
    diagnostic: string;
    actionsRealisees: string;
    gpsLat: string;
    gpsLng: string;
  }>({
    type: getDefaultType(),
    clientId: clientId || '',
    machineIds: machineId ? [machineId] : [] as string[],
    technicienId: 'TECH001',
    statut: 'PLANIFIEE' as StatutType,
    dateDebut: new Date().toISOString().slice(0, 16),
    diagnostic: '',
    actionsRealisees: '',
    gpsLat: '',
    gpsLng: ''
  });

  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientMachines, setClientMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [interventionStarted, setInterventionStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [newConstatation, setNewConstatation] = useState('');
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [showPartSearch, setShowPartSearch] = useState(false);

  const gpsTracking = useInterventionGPS({
    machineId: selectedMachine?._id || '',
    machineLat: parseFloat(selectedMachine?.gpsLat || '0'),
    machineLng: parseFloat(selectedMachine?.gpsLng || '0'),
    onAutoStart: () => { alert('🎯 Intervention démarrée automatiquement'); handleStartIntervention(); },
    onAutoPause: () => { alert('⏸️ Intervention en pause'); },
    onAutoResume: () => { alert('▶️ Intervention reprise'); }
  });

  // ✅ CHARGEMENT INITIAL (Données globales)
  useEffect(() => {
    fetchClients({ limit: 100 });
    fetchMachines({ limit: 100 });
    fetchSpareParts({ limit: 200 });
    loadCurrentUser();
  }, []);

  // ✅ Chargement au montage du composant
  useEffect(() => {
    if (interventionId) {
      console.log('🔄 Chargement de l\'intervention existante:', interventionId);
      loadInterventionData(interventionId);
    }
  }, [interventionId]);

  const loadInterventionData = async (id: string) => {
    try {
      const result = await api.entities.interventions.get(id);

    if (!result) {
  console.error('❌ Intervention non trouvée:', id);
  alert('Cette intervention n\'existe plus ou a été supprimée.');
  onNavigate('interventions');
  return;
}

if (result) {
  console.log('✅ Données chargées, mise à jour du formulaire');
  // ... reste du code

        // 1. Mise à jour du formulaire principal
        setFormData({
          type: result.type,
          clientId: result.clientId,
          machineIds: result.machineIds || [],
          technicienId: result.technicienId || 'TECH001',
          statut: result.statut,
          dateDebut: result.dateDebut ? new Date(result.dateDebut).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
          diagnostic: result.diagnostic || '',
          actionsRealisees: result.actionsRealisees || '',
          gpsLat: result.gpsLat || '',
          gpsLng: result.gpsLng || ''
        });

        // 2. RESTAURATION DE PROTOCOLDATA
        if (result.protocolData) {
          if (result.protocolData.diagnostics && Array.isArray(result.protocolData.diagnostics)) {
            setDiagnostics(result.protocolData.diagnostics);
          }
          if (result.protocolData.pieces && Array.isArray(result.protocolData.pieces)) {
            setSelectedParts(result.protocolData.pieces);
          }
        }

        // 3. FALLBACK : Restauration depuis les anciens champs
        if (!result.protocolData?.diagnostics && result.diagnostics) {
          try {
            if (result.diagnostics !== 'undefined' && result.diagnostics !== 'null' && result.diagnostics !== '') {
              const parsedDiagnostics = JSON.parse(result.diagnostics);
              setDiagnostics(parsedDiagnostics);
            }
          } catch (e) { console.error('❌ Erreur parsing diagnostics:', e); }
        }

        if (!result.protocolData?.pieces && result.piecesUtilisees) {
          try {
            if (result.piecesUtilisees !== 'undefined' && result.piecesUtilisees !== 'null' && result.piecesUtilisees !== '') {
              const parsedParts = JSON.parse(result.piecesUtilisees);
              setSelectedParts(parsedParts.map((p: any) => ({ partId: p.partId, quantity: p.quantity })));
            }
          } catch (e) { console.error('❌ Erreur parsing pièces:', e); }
        }

        // 4. Gestion de l'état "Démarré"
        if (result.statut === 'EN_COURS') {
          setInterventionStarted(true);
          setStartTime(new Date(result.dateDebut));
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement intervention:', error);
      alert('Impossible de charger les données de cette intervention.');
    }
  };

  // Pré-remplissage maintenance
  useEffect(() => {
    if (maintenanceSelectionData && !interventionId) {
      console.log('📥 [MAINTENANCE] Pré-remplissage du formulaire avec la sélection');

      const machineIds = maintenanceSelectionData.machineKitSelections.map((s: any) => s.machineId);

      setFormData(prev => ({
        ...prev,
        type: 'MAINTENANCE',
        clientId: maintenanceSelectionData.clientId || prev.clientId,
        machineIds: machineIds,
        actionsRealisees: 'Maintenance programmée'
      }));
    }
  }, [maintenanceSelectionData, interventionId]);

  const loadCurrentUser = async () => {
    try {
      const result = await api.entities.utilisateurs.list({ limit: 1 });
      if (result.list && result.list.length > 0) setCurrentUser(result.list[0]);
    } catch (error) { console.error('Erreur:', error); }
  };

  // Gestion du Client
  useEffect(() => {
    if (formData.clientId) {
      // ✅ SÉCURITÉ : ajout de || [] au cas où clients n'est pas encore chargé
      const foundClient = (clients || []).find(c => c._id === formData.clientId);
      setSelectedClient(foundClient || null);

      if (!foundClient) {
        fetchClients({ filter: { _id: formData.clientId } });
      }
    }
  }, [formData.clientId, clients]);

  // Gestion des Machines
  useEffect(() => {
    if (formData.clientId) {
      // ✅ SÉCURITÉ : ajout de || []
      const filtered = (machines || []).filter(m => m.clientId === formData.clientId);
      setClientMachines(filtered);

      if (filtered.length === 0) {
        console.log('⚠️ Machines vides pour le client:', formData.clientId, '=> Chargement spécifique...');
        fetchMachines({ filter: { clientId: formData.clientId } });
      }
    } else {
      setSelectedClient(null);
      setClientMachines([]);
      setFormData(prev => ({ ...prev, machineIds: [] }));
    }
  }, [formData.clientId, machines]);

  useEffect(() => {
    if (!interventionStarted || !startTime || gpsTracking?.isPaused) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [interventionStarted, startTime, gpsTracking?.isPaused]);

  useEffect(() => {
    // ✅ SÉCURITÉ : ajout de || []
    if (formData.machineIds.length > 0) {
      setSelectedMachine((machines || []).find(m => m._id === formData.machineIds[0]));
    } else {
      setSelectedMachine(null);
    }
  }, [formData.machineIds, machines]);

  // --- Helpers Diagnostics & Pièces ---
  const addDiagnostic = () => {
    if (!newConstatation.trim()) return alert('Veuillez saisir une constatation');
    setDiagnostics(prev => [...prev, { id: Date.now().toString(), constatation: newConstatation, resolu: false, action: '' }]);
    setNewConstatation('');
  };
  const removeDiagnostic = (id: string) => setDiagnostics(prev => prev.filter(d => d.id !== id));
  const updateDiagnosticAction = (id: string, action: string) => setDiagnostics(prev => prev.map(d => d.id === id ? { ...d, action } : d));
  const toggleDiagnosticResolved = (id: string) => setDiagnostics(prev => prev.map(d => d.id === id ? { ...d, resolu: !d.resolu } : d));

  const addSparePart = (partId: string) => {
    if (selectedParts.find(p => p.partId === partId)) return alert('Pièce déjà ajoutée');
    setSelectedParts(prev => [...prev, { partId, quantity: 1 }]);
    setShowPartSearch(false);
    setPartSearchQuery('');
  };
  const updatePartQuantity = (partId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedParts(prev => prev.map(p => p.partId === partId ? { ...p, quantity } : p));
  };
  const removeSparePart = (partId: string) => setSelectedParts(prev => prev.filter(p => p.partId !== partId));
  
  const filteredSpareParts = (spareParts || []).filter(part =>
    part.reference?.toLowerCase().includes(partSearchQuery.toLowerCase()) ||
    part.designation?.toLowerCase().includes(partSearchQuery.toLowerCase())
  );

  const handleGetLocation = async () => {
    try {
      const pos = await getCurrentPosition();
      setFormData(prev => ({ ...prev, gpsLat: pos.coords.latitude.toString(), gpsLng: pos.coords.longitude.toString() }));
      alert('✅ Position GPS enregistrée !');
    } catch (error) { alert('❌ Impossible d\'obtenir la position'); }
  };

  const handleStartIntervention = () => {
    setInterventionStarted(true);
    setStartTime(new Date());
    setFormData(prev => ({ ...prev, statut: 'EN_COURS' }));
  };

  const handleManualStart = async () => {
    if (!selectedMachine?.gpsLat || !selectedMachine?.gpsLng) return alert('⚠️ Pas de GPS sur cette machine');
    try { await gpsTracking?.manualStart(); handleStartIntervention(); }
    catch (error) { alert('❌ Erreur démarrage'); }
  };

  const handleEndIntervention = () => {
    gpsTracking?.endIntervention();
    setFormData(prev => ({ ...prev, statut: 'TERMINEE' }));
  };

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleMachine = (machineId: string) => {
    setFormData(prev => ({
      ...prev,
      machineIds: prev.machineIds.includes(machineId) ? prev.machineIds.filter(id => id !== machineId) : [...prev.machineIds, machineId]
    }));
  };

  // --- FONCTION POUR DÉMARRER LE DÉPANNAGE ---
  const handleStartTroubleshooting = async () => {
    if (!formData.clientId || formData.machineIds.length === 0) {
      alert('Veuillez sélectionner un client et une machine.');
      return;
    }

    try {
      const now = new Date();
      const numeroIntervention =
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        formData.technicienId.slice(-3);

      const newIntervention = await createIntervention({
        ...formData,
        numeroIntervention,
        statut: 'EN_COURS',
        dateDebut: new Date().toISOString(),
        creator: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Intervention Dépannage créée, ID:', newIntervention._id);

      onNavigate('troubleshooting', {
        interventionId: newIntervention._id,
        clientId: newIntervention.clientId,
        machineId: newIntervention.machineIds[0]
      });

    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du démarrage du dépannage');
    }
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  console.log('🔴 handleSubmit déclenché !');
    if (!formData.clientId || formData.machineIds.length === 0) return alert('Client et Machine requis');
    setLoading(true);

    try {
      const now = new Date();
      const numeroIntervention =
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        formData.technicienId.slice(-3);

      let maintenanceData = undefined;
      if (maintenanceSelectionData) {
        maintenanceData = {
          machines: maintenanceSelectionData.machineKitSelections.map((sel: any) => {
            const sections = maintenanceSelectionData.sectionsData?.[sel.machineId] || [];
            return {
              machineId: sel.machineId,
              machineNom: (machines || []).find(m => m._id === sel.machineId)?.nom || 'Machine',
              kitId: sel.kitId,
              kitNom: 'Kit d\'entretien',
              sections: sections.map((section: any) => ({
                sectionNom: section.nom,
                tachesIds: section.taches?.map((t: any) => t.idTache || t._id) || [],
                tachesCompletees: [],
                progression: 0
              }))
            };
          }),
          tachesCompletees: [],
          progressionGlobale: 0,
          totalTaches: maintenanceSelectionData.machineKitSelections.reduce((total: number, sel: any) => {
            const sections = maintenanceSelectionData.sectionsData?.[sel.machineId] || [];
            return total + sections.reduce((sum: number, section: any) =>
              sum + (section.taches?.length || 0), 0);
          }, 0),
          tachesCompleteesCount: 0
        };
      }

      const interventionData = {
        ...formData,
        numeroIntervention,
        dateDebut: startTime ? startTime.toISOString() : new Date(formData.dateDebut).toISOString(),
        dateFin: formData.statut === 'TERMINEE' ? new Date().toISOString() : undefined,
        duree: elapsedTime && formData.statut === 'TERMINEE' ? Math.floor(elapsedTime / 60) : undefined,
        totalDuration: elapsedTime && formData.statut === 'TERMINEE' ? Math.floor(elapsedTime / 60) : undefined,
        creator: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...maintenanceData,

        protocolData: {
          constatations: diagnostics.map(d => d.constatation).join('\n\n'),
          diagnostic: formData.diagnostic,
          pieces: selectedParts,
          actionsRealisees: diagnostics.map(d => d.action).filter(a => a).join('\n\n'),
          diagnostics: diagnostics,
          verifications: {},
          ...(maintenanceSelectionData && {
            sectionsEntretien: maintenanceSelectionData.machineKitSelections || []
          })
        }
      };

      let savedId = interventionId;

      if (interventionId) {
        await updateIntervention(interventionId, interventionData);
        const typeEmojis: Record<string, string> = {
          'MAINTENANCE': '⚙️', 'REPAIR': '🔧', 'INSTALLATION': '🔨', 'COMMISSIONING': '🚀'
        };
        alert(`${typeEmojis[formData.type]} Intervention mise à jour avec succès !`);
      } else {
        const created = await createIntervention(interventionData);
        savedId = created._id;

        const typeEmojis: Record<string, string> = {
          'MAINTENANCE': '🔧', 'REPAIR': '🔨', 'INSTALLATION': '📦', 'COMMISSIONING': '🚀'
        };
        const typeLabels: Record<string, string> = {
          'MAINTENANCE': 'Entretien',
          'REPAIR': 'Dépannage',
          'INSTALLATION': 'Installation',
          'COMMISSIONING': 'Mise en service'
        };
        const emoji = typeEmojis[formData.type] || '⚙️';
        const label = typeLabels[formData.type] || 'Intervention';

        alert(`${emoji} ${label} créée(e) avec succès !\nN° ${numeroIntervention}`);
      }

      setTimeout(() => {
        onNavigate('client-detail', { clientId: formData.clientId });
      }, 500);
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert(`❌ Erreur lors de l'enregistrement: ${error instanceof Error ? error.message : 'Inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseIntervention = async () => {
    if (!formData.clientId || formData.machineIds.length === 0) return alert('Client/Machine requis');
    if (diagnostics.some(d => !d.resolu)) {
      if (!confirm('⚠️ Certains diagnostics ne sont pas résolus. Clôturer quand même ?')) return;
    }
    if (!confirm('Clôturer définitivement cette intervention et retourner au client ?')) return;

    console.log('🔴 Clôture...');
    setLoading(true);

    try {
      handleEndIntervention();
      const now = new Date();
      const numeroIntervention =
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        formData.technicienId.slice(-3);

      const interventionData = {
        ...formData,
        statut: 'TERMINEE' as StatutType,
        numeroIntervention,
        dateDebut: startTime ? startTime.toISOString() : new Date(formData.dateDebut).toISOString(),
        dateFin: new Date().toISOString(),
        duree: elapsedTime ? Math.floor(elapsedTime / 60) : undefined,
        totalDuration: elapsedTime ? Math.floor(elapsedTime / 60) : undefined,
        constatations: diagnostics.map(d => d.constatation).join('\n\n'),
        travauxEffectues: diagnostics.map(d => d.action).filter(a => a).join('\n\n'),
        resolu: diagnostics.length > 0 ? diagnostics.every(d => d.resolu) : undefined,
        diagnostics: JSON.stringify(diagnostics),
        piecesUtilisees: JSON.stringify(selectedParts),
        gpsStartLat: gpsTracking?.events[0]?.lat?.toString(),
        gpsStartLng: gpsTracking?.events[0]?.lng?.toString(),
        gpsEndLat: gpsTracking?.currentPosition?.lat?.toString(),
        gpsEndLng: gpsTracking?.currentPosition?.lng?.toString(),
        pausesGps: JSON.stringify(gpsTracking?.events.filter(e => e.type === 'PAUSE' || e.type === 'RESUME')),
        distanceEvents: JSON.stringify(gpsTracking?.events),
        creator: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let savedIntervention: any = null;
      let savedInterventionId = interventionId;

      if (interventionId) {
        savedIntervention = await updateIntervention(interventionId, interventionData);
      } else {
        savedIntervention = await createIntervention(interventionData);
        savedInterventionId = savedIntervention._id;
      }

      // Mise à jour du stock des pièces
      if (selectedParts.length > 0 && savedInterventionId) {
        for (const sp of selectedParts) {
          try {
            await api.entities.intervention_parts.create({
              interventionId: savedInterventionId.toString(),
              partId: sp.partId.toString(),
              quantite: sp.quantity,
              creator: 'system',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            const part = (spareParts || []).find(p => p._id === sp.partId);
            if (part && part.stock >= sp.quantity) {
              await api.entities.spare_parts.update(sp.partId, { stock: part.stock - sp.quantity, updatedAt: new Date().toISOString() });
            }
          } catch (partError) { console.error('Erreur pièce:', partError); }
        }
      }

      // Génération PDF
      try {
        console.log('📄 Génération du rapport de clôture PDF...');

        const pdfUsedParts = selectedParts.map(sp => {
          const partDetail = (spareParts || []).find(p => p._id === sp.partId);
          return {
            designation: partDetail?.designation || 'N/A',
            reference: partDetail?.reference || 'N/A',
            quantite: sp.quantity,
            prixUnitaire: partDetail?.prixUnitaire || 0
          };
        });

        const pdfData = {
          intervention: {
            ...(savedIntervention || interventionData),
            numeroIntervention: interventionData.numeroIntervention,
            type: interventionData.type,
            dateDebut: interventionData.dateDebut,
            dateFin: interventionData.dateFin,
            duree: elapsedTime ? Math.floor(elapsedTime / 60) : 0,
            technicianName: currentUser?.name || 'N/A',
            actionsRealisees: interventionData.actionsRealisees,
            travauxEffectues: interventionData.travauxEffectues,
            constatations: interventionData.constatations
          },
          client: selectedClient,
          machines: (clientMachines || []).filter(m => formData.machineIds.includes(m._id)),
          usedParts: pdfUsedParts
        };

        const pdfDoc = await generateInterventionPDF(pdfData);

        const pdfBlob = pdfDoc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');

        // AJOUT : envoi reel du rapport au client par email
   const notifResult = await sendClientInterventionNotification({
  clientId: formData.clientId,
  interventionType: formData.type as any,
  numeroIntervention: interventionData.numeroIntervention,
  dateIntervention: interventionData.dateDebut,
  pdfDoc: pdfDoc,
  machineName: clientMachines.find(m => m._id === formData.machineIds[0])?.nom,
  technicienName: currentUser ? `${currentUser.prenom || ''}` : undefined,
  technicienId: currentUser?._id  
});

if (notifResult.skipped) {
  console.info('[Cloture] Client sans email - notification ignorée');
} else if (!notifResult.success) {
  console.warn('[Cloture] Email client non envoyé:', notifResult.error);
} else {
  console.log('✅ Email envoyé au client');
}

      } catch (pdfError) {
        console.error('❌ Erreur génération PDF:', pdfError);
      }

      alert(`✅ Intervention Clôturée !\nN° ${numeroIntervention}`);
onNavigate('client-detail', { clientId: formData.clientId });
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur clôture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
<Button variant="ghost" onClick={() => onNavigate(returnTo, returnParams)} className="flex items-center gap-2">          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {interventionId ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
          </h1>
          <p className="text-gray-600 mt-1">Remplissez les informations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ✅ BANDEAU LECTURE SEULE */}
        {readOnly && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">📋</div>
                <div>
                  <h3 className="font-bold text-blue-900">Mode consultation - Intervention terminée</h3>
                  <p className="text-sm text-blue-700">Cette intervention est clôturée. Vous ne pouvez pas la modifier.</p>
                </div>
              </div>

              <Button
                type="button"
                onClick={async () => {
                  try {
                    console.log('🔵 Début génération PDF');
                    const { generateInterventionPDF } = await import('../../utils/pdfGenerator');

                    console.log('🔵 Module PDF importé, préparation des données...');

                    const pdfData = {
                      intervention: {
                        ...formData,
                        _id: interventionId,
                        numeroIntervention: formData.numeroIntervention || interventionId?.slice(-6),
                        protocolData: {
                          diagnostics: diagnostics,
                          pieces: selectedParts,
                          diagnostic: formData.diagnostic
                        }
                      },
                      client: selectedClient,
                      machines: (clientMachines || []).filter(m => formData.machineIds.includes(m._id)),
                      usedParts: selectedParts.map(sp => {
                        const part = (spareParts || []).find(p => p._id === sp.partId);
                        return {
                          ...part,
                          quantite: sp.quantity,
                          partId: sp.partId
                        };
                      })
                    };

                    const pdf = await generateInterventionPDF(pdfData);
                    const fileName = `Rapport_${formData.numeroIntervention || interventionId?.slice(-6)}.pdf`;
                    pdf.save(fileName);

                    alert('✅ Rapport PDF téléchargé !');
                  } catch (error) {
                    console.error('❌ Erreur génération PDF:', error);
                    alert(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
                  }
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText size={18} />
                Télécharger le rapport PDF
              </Button>
            </div>
          </div>
        )}

        {/* Type */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Type d'intervention</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(INTERVENTION_TYPES)
              .filter(([key]) => {
                if (key === 'REPAIR') return hasPermission('create_interventions_repair');
                if (key === 'MAINTENANCE') return hasPermission('create_interventions_maintenance');
                if (key === 'INSTALLATION') return hasPermission('create_interventions_installation');
                if (key === 'COMMISSIONING') return hasPermission('create_interventions_commissioning');
                return false;
              })
              .map(([key, { label, icon }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: key as any }))}
                  className={`p-4 border-2 rounded-lg transition-all ${formData.type === key ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  disabled={readOnly}
                >
                  <div className="text-3xl mb-2">{icon}</div>
                  <div className="font-medium text-sm">{label}</div>
                </button>
              ))
            }
          </div>
        </Card>

        {/* Client & Machines */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Client et Machines</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              disabled={readOnly || !!maintenanceSelectionData || !!interventionId}
            >
              <option value="">Sélectionnez un client</option>
              {/* ✅ SÉCURITÉ : (clients || []) */}
              {(clients || []).map(client => (
                <option key={client._id} value={client._id}>
                  {client.nom} - {client.nomFerme}
                </option>
              ))}
            </select>
          </div>

          {selectedClient && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Machines *</label>
              {clientMachines.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune machine (Vérifiez le client et rechargez si nécessaire)</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* ✅ SÉCURITÉ : (clientMachines || []) */}
                  {(clientMachines || []).map(machine => (
                    <button
                      key={machine._id}
                      type="button"
                      onClick={() => toggleMachine(machine._id)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${formData.machineIds.includes(machine._id) ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                      disabled={readOnly}
                    >
                      <div className="font-medium">{machine.nom}</div>
                      <div className="text-sm text-gray-600">N° {machine.numeroSerie}</div>
                    </button>
                  ))}
                </div>
              )}

              {!readOnly && formData.type === 'MAINTENANCE' && formData.clientId && formData.machineIds.length > 0 && (
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    onClick={() => {
                      onNavigate('multi-machine-kit-selection', {
                        clientId: formData.clientId,
                        machineIds: formData.machineIds
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    Suivant : Sélectionner les kits d'entretien
                  </Button>
                </div>
              )}

              {!readOnly && formData.type === 'COMMISSIONING' && formData.clientId && formData.machineIds.length > 0 && (
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!formData.clientId || formData.machineIds.length === 0) {
                        alert('Veuillez sélectionner un client et une machine.');
                        return;
                      }

                      try {
                        const now = new Date();
                        const numeroIntervention =
                          now.getFullYear().toString() +
                          (now.getMonth() + 1).toString().padStart(2, '0') +
                          now.getDate().toString().padStart(2, '0') +
                          now.getHours().toString().padStart(2, '0') +
                          formData.technicienId.slice(-3);

                        const newIntervention = await createIntervention({
                          ...formData,
                          numeroIntervention,
                          statut: 'EN_COURS',
                          dateDebut: new Date().toISOString(),
                          creator: 'system',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        });

                        onNavigate('commissioning-protocol', {
                          interventionId: newIntervention._id,
                          clientId: newIntervention.clientId,
                          machineIds: newIntervention.machineIds
                        });

                      } catch (error) {
                        console.error('Erreur:', error);
                        alert('Erreur lors de la création.');
                      }
                    }}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Play size={18} />
                    Ouvrir le protocole de mise en service VMS
                  </Button>
                </div>
              )}

  {!readOnly && formData.type === 'INSTALLATION' && formData.clientId && formData.machineIds.length > 0 && (
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    onClick={async () => {
                      console.log('🔵 CLIC sur protocole de montage');
                      console.log('📋 Type:', formData.type);
                      console.log('📋 Client:', formData.clientId);
                      console.log('🔧 Machines:', formData.machineIds);
                      
                      if (!formData.clientId || formData.machineIds.length === 0) {
                        alert('Veuillez sélectionner un client et une machine.');
                        return;
                      }

                      try {
                        console.log('🚀 Création intervention INSTALLATION...');
                        const now = new Date();
                        const numeroIntervention =
                          now.getFullYear().toString() +
                          (now.getMonth() + 1).toString().padStart(2, '0') +
                          now.getDate().toString().padStart(2, '0') +
                          now.getHours().toString().padStart(2, '0') +
                          formData.technicienId.slice(-3);

                        const newIntervention = await createIntervention({
                          ...formData,
                          numeroIntervention,
                          statut: 'EN_COURS',
                          dateDebut: new Date().toISOString(),
                          creator: 'system',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        });

                        console.log('✅ Intervention créée:', newIntervention._id);
                        console.log('🧭 Navigation vers installation-protocol');

                        onNavigate('installation-protocol', {
                          interventionId: newIntervention._id,
                          clientId: newIntervention.clientId,
                          machineId: newIntervention.machineIds[0]
                        });
                        
                        console.log('✅ Commande de navigation envoyée');

                      } catch (error) {
                        console.error('❌ Erreur complète:', error);
                        alert('Erreur lors de la création.');
                      }
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Play size={18} />
                    Ouvrir le protocole de montage
                  </Button>
                </div>
              )}

            </div>
          )}
        </Card>
        {/* GPS */}
        {!readOnly && selectedMachine && selectedMachine.gpsLat && selectedMachine.gpsLng && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Suivi GPS</h3>
                {interventionStarted ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${gpsTracking?.isPaused ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
                      <span className="font-medium">{gpsTracking?.isPaused ? 'En pause' : 'En cours'}</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-600 tabular-nums">{formatElapsedTime(elapsedTime)}</div>
                  </div>
                ) : (
                  <p className="text-gray-600">Démarrage auto ou manuel</p>
                )}
              </div>
              <div className="flex gap-2">
                {!interventionStarted ? (
                  <Button type="button" size="sm" onClick={handleManualStart} className="flex items-center gap-2"><Play size={16} /> Démarrer</Button>
                ) : (
                  <Button type="button" size="sm" variant="destructive" onClick={handleEndIntervention} className="flex items-center gap-2"><StopCircle size={16} /> Terminer</Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Diagnostics (REPAIR) */}
        {formData.type === 'REPAIR' && (
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Diagnostics et Constatations</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Diagnostic principal</label>
              <textarea
                value={formData.diagnostic}
                onChange={(e) => setFormData(prev => ({ ...prev, diagnostic: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Le diagnostic principal..."
                disabled={readOnly}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nouvelle constatation</label>
              <div className="flex gap-2">
                <input type="text" value={newConstatation} onChange={(e) => setNewConstatation(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" disabled={readOnly} />
                <Button type="button" onClick={addDiagnostic} className="flex items-center gap-2"><Plus size={20} /> Ajouter</Button>
              </div>
            </div>
            {diagnostics.length > 0 && (
              <div className="space-y-4">
                {diagnostics.map((diag, index) => (
                  <div key={diag.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-gray-900">Constatation #{index + 1}</span>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${diag.resolu ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{diag.resolu ? 'Résolu' : 'En attente'}</div>
                        </div>
                        <p className="text-gray-700">{diag.constatation}</p>
                      </div>
                      <Button type="button" variant="ghost" onClick={() => removeDiagnostic(diag.id)} disabled={readOnly}><X size={20} /></Button>
                    </div>
                    <div className="space-y-3">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Action réalisée</label><textarea value={diag.action} onChange={(e) => updateDiagnosticAction(diag.id, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} disabled={readOnly} /></div>
                      <div className="flex items-center gap-2" disabled={readOnly}><input type="checkbox" id={`resolu-${diag.id}`} checked={diag.resolu} onChange={() => toggleDiagnosticResolved(diag.id)} className="w-4 h-4 text-blue-600" /><label htmlFor={`resolu-${diag.id}`} className="text-sm font-medium cursor-pointer">Marquer comme résolu</label></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Pièces Détachées (REPAIR) */}
        {formData.type === 'REPAIR' && (
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pièces détachées</h2>
            <div className="mb-4">
              <Button type="button" onClick={() => setShowPartSearch(!showPartSearch)} disabled={readOnly}><Search size={20} /> {showPartSearch ? 'Masquer' : 'Rechercher'}</Button>
              {showPartSearch && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <Input placeholder="Réf ou désignation..." value={partSearchQuery} onChange={(e) => setPartSearchQuery(e.target.value)} disabled={readOnly} />
                  <div className="max-h-60 overflow-y-auto space-y-2 mt-3">
                    {filteredSpareParts.map(part => (
                      <button key={part._id} type="button" onClick={() => addSparePart(part._id)} className="w-full p-3 border border-gray-200 rounded-lg hover:bg-blue-50 text-left" disabled={readOnly || selectedParts.some(p => p.partId === part._id)}>
                        <div className="font-medium">{part.reference}</div>
                        <div className="text-sm text-gray-600">{part.designation}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {selectedParts.length > 0 && (
              <div className="space-y-3">
                {selectedParts.map(sp => {
                  const part = (spareParts || []).find(p => p._id === sp.partId);
                  return (
                    <div key={sp.partId} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white">
                      <Package size={20} className="text-blue-600" />
                      <div className="flex-1"><div className="font-medium">{part?.reference}</div><div className="text-sm text-gray-600">{part?.designation}</div></div>
                      <div className="flex items-center gap-2"><label className="text-sm">Qté:</label><input type="number" min="1" value={sp.quantity} onChange={(e) => updatePartQuantity(sp.partId, parseInt(e.target.value) || 1)} disabled={readOnly} /></div>
                      <Button type="button" variant="ghost" onClick={() => removeSparePart(sp.partId)} disabled={readOnly}><X size={20} /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* Code Erreur */}
        {!readOnly && (
          <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche de Code Erreur</label>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex justify-start text-gray-500 bg-white hover:bg-gray-50 h-11"
              onClick={() => {
                setErrorCodeInput(''); // On vide pour une recherche propre
                setIsErrorCodeModalOpen(true);
              }}
            >
              <Search size={20} className="mr-2 text-gray-400" />
              Cliquez ici pour rechercher un code erreur (ex: 8.16...)
            </Button>
          </div>
        )}
        {/* Info Complémentaires */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Informations complémentaires</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date et heure de début *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input type="datetime-local" value={formData.dateDebut} onChange={(e) => setFormData(prev => ({ ...prev, dateDebut: e.target.value }))} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required disabled={readOnly} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
              <select value={formData.statut} onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value as any }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" disabled={readOnly}>
                <option value="PLANIFIEE">Planifiée</option>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINEE">Terminée</option>
                <option value="ANNULEE">Annulée</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-700 mb-2">Géolocalisation</label>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={handleGetLocation} className="flex items-center gap-2" disabled={readOnly}><MapPin size={20} /> Obtenir position GPS</Button>
                {formData.gpsLat && formData.gpsLng && <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm"><MapPin size={16} /> Position enregistrée</div>}
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          {readOnly ? (
            // ✅ MODE LECTURE SEULE : Bouton Retour uniquement
            <Button
              type="button"
              onClick={() => onNavigate('client-detail', { clientId: formData.clientId })}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={20} /> Retour au client
            </Button>
          ) : (
            // ✅ MODE ÉDITION : Boutons normaux
            <>
              <Button type="button" variant="ghost" onClick={() => onNavigate(returnTo, returnParams)}>Annuler</Button>
              {formData.type === 'REPAIR' && diagnostics.length > 0 && (
                <Button type="button" onClick={handleCloseIntervention} className="flex items-center gap-2 bg-orange-400 hover:bg-orange-500">
                  <StopCircle size={20} /> Clôturer le dépannage
                </Button>
              )}
              <Button type="submit" disabled={loading} className="intervention-action-save flex items-center gap-2">
                <Save size={20} /> {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </>
          )}
        </div>
      </form>

      <ErrorCodeSearchModal
        isVisible={isErrorCodeModalOpen}
        onClose={() => setIsErrorCodeModalOpen(false)}
        onSelect={(errorCodeData) => {
          let titre = errorCodeData.titre, cause = errorCodeData.cause, action = errorCodeData.action;
          if (!titre && !cause && !action && errorCodeData.chapitre) {
            const parts = errorCodeData.chapitre.split(",");
            if (parts.length >= 6) {
              titre = parts[1].replace(/\//g, '');
              cause = parts[4].replace(/\//g, '');
              action = parts[5].replace(/\//g, '');
            }
          }
          const text = `CODE ERREUR: ${errorCodeData.alarme}\nTITRE: ${titre || 'N/A'}\nCAUSE: ${cause || 'N/A'}\nACTION: ${action || 'N/A'}`;
          setFormData(prev => ({ ...prev, diagnostic: text }));
          setIsErrorCodeModalOpen(false);
          setErrorCodeInput('');
        }}
        initialSearchTerm={errorCodeInput}
      />
    </div>
  );
}