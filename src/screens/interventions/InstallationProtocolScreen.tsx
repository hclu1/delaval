// InstallationProtocolScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {ArrowLeft, Save, CheckCircle, Plus, MapPin, X, Clock} from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useMachines } from '../../hooks/useMachines';
import { useUsers } from '../../hooks/useUsers';
import { api } from '../../lib/api';
import { getCurrentPosition } from '../../utils/geoUtils';
import { GPSTrackingAlert } from '../../components/installation/GPSTrackingAlert';
import { MachineTasksView } from '../installation/MachineTasksView';
import { AddMachineModal } from '../../components/installation/AddMachineModal';
import { sendInstallationReportToResponsable } from '../../services/installationReportService';
import { sendClientInterventionNotification } from '../../services/clientNotificationService'; // AJOUT

const TACHES_OBLIGATOIRES = [
  { id: 'oblig_electricite_generale', description: 'Électricité générale', obligatoire: true },
  { id: 'oblig_plomberie_generale', description: 'Plomberie générale', obligatoire: true },
  { id: 'oblig_electricite_machine', description: 'Électricité machine', obligatoire: true },
  { id: 'oblig_plomberie_machine', description: 'Plomberie machine', obligatoire: true },
  { id: 'oblig_frigoriste', description: 'Frigoriste', obligatoire: true },
  { id: 'oblig_monteur_machine', description: 'Monteur machine', obligatoire: true },
  { id: 'oblig_tuyauterie_inox', description: 'Tuyauterie inox', obligatoire: true },
  { id: 'oblig_prt', description: 'PRT', obligatoire: true },
  { id: 'oblig_vis', description: 'Vis', obligatoire: true },
  { id: 'oblig_circulation', description: 'Circulation', obligatoire: true },
];

const genId = (): string => Date.now().toString(36) + Math.random().toString(36).substr(2);

const formatHeures = (heures: number) => {
  const h = Math.floor(heures);
  const m = Math.round((heures - h) * 60);
  return m > 0 ? `${h}h ${m.toString().padStart(2, '0')}min` : `${h}h 00min`;
};

const genererNumeroIntervention = (userId: string): string => {
  const now = new Date();
  const annee = now.getFullYear().toString();
  const mois = (now.getMonth() + 1).toString().padStart(2, '0');
  const jour = now.getDate().toString().padStart(2, '0');
  const heure = now.getHours().toString().padStart(2, '0');
  const userCode = userId.slice(-3).padStart(3, '0');
  return `${annee}${mois}${jour}${heure}${userCode}`;
};

interface InstallationProtocolScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  interventionId: string;
  clientId: string;
  machineId?: string;
}

export function InstallationProtocolScreen({
  onNavigate,
  interventionId,
  clientId,
  machineId
}: InstallationProtocolScreenProps) {

  const { clients, fetchClients } = useClients();
  const { machines: allMachines, fetchMachines } = useMachines();
  const { users: utilisateurs, fetchUsers } = useUsers();

  const [installationData, setInstallationData] = useState<any>(null);
  // Ref pour accéder à la valeur courante dans le setInterval sans closure stale
  const installationDataRef = useRef<any>(null);
  // Ref pour bloquer le polling pendant une sauvegarde (évite l'écrasement par le polling)
  const isSavingRef = useRef<boolean>(false);
const lastRetryRef = useRef<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [referenceMachine, setReferenceMachine] = useState<any>(null);
  const [montageId, setMontageId] = useState<string | null>(null);
  const [machineGPS, setMachineGPS] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingMontage, setIsLoadingMontage] = useState(true);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

// Réinitialiser selectedMachineId si la machine disparaît (évite setState pendant rendu)
useEffect(() => {
  if (!selectedMachineId) return;
  const machine = installationData?.machines?.find((m: any) => m.id === selectedMachineId);
  if (!machine) setSelectedMachineId(null);
}, [installationData?.machines, selectedMachineId]);

// 🔄 POLLING : Rafraîchir les données toutes les 5 secondes via photos[0] base64
useEffect(() => {
  if (!montageId) return;

  const interval = setInterval(async () => {
    if (isSavingRef.current) return;
    try {
      const montage = await api.entities.montages.get(montageId);
      if (!montage) return;
      if (montage.status === 'TERMINEE') return;
if (!montage?.photos?.[0]) {
  const now = Date.now();
  if (
    installationDataRef.current?.machines?.length > 0 &&
    now - lastRetryRef.current > 30000
  ) {
    lastRetryRef.current = now;
    console.warn('⚠️ photos[0] absent → retry unique (30s cooldown)');
    saveMontage({}).catch((e: any) => console.error('❌ Retry échoué:', e));
  }
  return;
}
const recoveredData = montage.donneesJson || montage.sections || {};
      setInstallationData((prev: any) => {
        if (!prev) return prev;
        if (prev.updatedAt === montage.updatedAt) return prev;
        return {
          ...prev,
          machines: recoveredData.machines || prev.machines,
          gpsLat: recoveredData.gpsLat ?? prev.gpsLat,
          gpsLng: recoveredData.gpsLng ?? prev.gpsLng,
          gpsPrisLe: recoveredData.gpsPrisLe ?? prev.gpsPrisLe,
          statut: montage.status,
          updatedAt: montage.updatedAt
        };
      });
    } catch (error) {
      console.error('❌ Erreur rafraîchissement automatique:', error);
    }
  }, 5000);

  return () => clearInterval(interval);

}, [montageId]);

useEffect(() => {
  const init = async () => {
    await loadCurrentUser();
    await loadMontage();
  };
  init();
  fetchClients({ filter: { _id: clientId } });
  fetchMachines({ filter: { clientId: clientId } });
  fetchUsers({ limit: 100 });
}, []);
  useEffect(() => {
    if (clientId && clients.length > 0) {
      setClient(clients.find((c: any) => c._id === clientId) || null);
    }
  }, [clientId, clients]);

  useEffect(() => {
    if (machineId && allMachines.length > 0) {
      const machine = allMachines.find((m: any) => m._id === machineId);
      setReferenceMachine(machine || null);
    }
  }, [machineId, allMachines]);

  useEffect(() => {
    if (installationData?.gpsLat && installationData?.gpsLng) {
      setMachineGPS({
        lat: installationData.gpsLat,
        lng: installationData.gpsLng
      });
    }
    // Maintenir le ref synchronisé pour le polling (évite la closure stale)
    installationDataRef.current = installationData;
  }, [installationData]);

const loadCurrentUser = async () => {
  try {
    const user = await api.auth.refreshUser();
    if (user) {
      const result = await api.entities.utilisateurs.list({ 
        filter: { email: user.email }, 
        limit: 1 
      });
      if (result.list && result.list.length > 0) {
        setCurrentUser(result.list[0]);
      } else {
        console.warn('👤 Aucun utilisateur trouvé pour cet email:', user.email);
      }
    }
  } catch (e) {
    console.error('❌ Erreur chargement utilisateur courant:', e);
  }
};
const loadMontage = async () => {
  try {
    const inter = await api.entities.interventions.get(interventionId);
    
    if (inter?.montageId) {
      const montage = await api.entities.montages.get(inter.montageId);
      
      if (montage) {
        // Lecture depuis photos[0] base64 (mécanisme fiable iOS + PC)
const recoveredData = montage.donneesJson || montage.sections || {};        
        const adaptedMontage = {
          ...montage,
          numeroIntervention: montage.interventionNumber,
          statut: montage.status,
          machines: recoveredData.machines || [],
          gpsLat: recoveredData.gpsLat,
          gpsLng: recoveredData.gpsLng,
          gpsPrisLe: recoveredData.gpsPrisLe,
          totalHeures: recoveredData.totalHeures,
          journaliers: recoveredData.journaliers,
          dateDebut: recoveredData.dateDebut,
          dateCloture: recoveredData.dateCloture,
          _id: montage._id
        };
        
        setInstallationData(adaptedMontage);
        setMontageId(adaptedMontage._id);
        setIsLoadingMontage(false);
        return true;
      }
    }
    setIsLoadingMontage(false);
    return false;
  } catch (e) {
    console.error('❌ Erreur chargement montage:', e);
    setIsLoadingMontage(false);
    return false;
  }
};
  const creerMontage = async () => {
    try {
      const numero = genererNumeroIntervention(currentUser?._id || '000');
      const machines: any[] = [];
      
      if (machineId && allMachines.length > 0) {
        const refMachine = allMachines.find((m: any) => m._id === machineId);
        if (refMachine) {
          machines.push({
            id: genId(),
            machineId: refMachine._id,
            nom: refMachine.nom || 'Sans nom',
            typeMachineId: refMachine.typeMachineId || '',
            typeMachineNom: typeof refMachine.typeMachine === 'object' 
              ? refMachine.typeMachine?.nom || 'Type inconnu'
              : refMachine.typeMachine || 'Type inconnu',
            serie: refMachine.numeroSerie || '',
            notes: refMachine.notes || '',
            relationType: 'MAITRE',
            heuresParTechnicien: []
          });
        }
      }
      
const now = new Date().toISOString();
const montage = await api.entities.montages.create({
  interventionNumber: numero,
  clientId,
  status: 'EN_COURS',
  donneesJson: { machines, dateDebut: now },
  assignedTechnicians: [],
  gpsValidated: false,
  createdAt: now,
  updatedAt: now
});

const adaptedMontage = {
  ...montage,
  numeroIntervention: montage.interventionNumber,
  statut: montage.status,
  machines: machines, // ← variable locale déjà construite, pas besoin du serveur        interventionId,
        machineReferenceId: machineId || null,
        dateDebut: new Date().toISOString(),
        _id: montage._id
      };

      setInstallationData(adaptedMontage);
      setMontageId(montage._id);

      await api.entities.interventions.update(interventionId, {
        montageId: montage._id,
        statut: 'EN_COURS'
      });

      console.log('✅ Montage créé:', montage._id);
    } catch (e) {
      console.error('❌ Erreur création montage:', e);
    }
  };
const saveMontage = async (updates: any) => {
  // Sur iPhone, montageId vient du state React qui peut être null
  // On le récupère aussi depuis installationDataRef qui est plus fiable
  const effectiveMontageId = montageId || installationDataRef.current?._id;
  
  console.log("🔵 saveMontage appelé", { montageId, effectiveMontageId, updates });

  if (!effectiveMontageId) {
    console.error("❌ saveMontage : montageId manquant !");
    alert("Erreur interne : ID de montage manquant.");
    return;
  }
  // Bloquer le polling
  isSavingRef.current = true;

  try {
    // Rafraîchir le token avant chaque écriture (évite échec silencieux sur iOS après veille)
    try {
      await api.auth.refreshUser();
    } catch (authErr) {
      console.warn('⚠️ Impossible de rafraîchir le token:', authErr);
    }

    // Base = ref en priorité (toujours synchrone), sinon state React
    const baseData = JSON.parse(JSON.stringify(installationDataRef.current || installationData || {}));

    if (!baseData) {
      throw new Error("Données locales introuvables pour la sauvegarde.");
    }

    // RÈGLE : si updates.machines est fourni → on l'utilise TOUJOURS, sans mélange
    // C'est la liste complète et à jour construite par l'appelant
    const dataToSave = {
      ...baseData,
      ...updates,
      machines: updates.machines !== undefined ? updates.machines : (baseData.machines || []),
      updatedAt: new Date().toISOString()
    };

    // Sécurité anti-effacement accidentel uniquement
    if (updates.machines && updates.machines.length === 0 && (baseData.machines?.length ?? 0) > 0) {
      console.warn("⚠️ Tentative d'envoi d'une liste de machines vide. Annulation.");
      isSavingRef.current = false;
      return baseData;
    }


    // Encodage base64 pour stockage dans photos[0] (fiable iOS + PC)
    const dataJSON = JSON.stringify({
      machines: dataToSave.machines || [],
      gpsLat: dataToSave.gpsLat || null,
      gpsLng: dataToSave.gpsLng || null,
      gpsPrisLe: dataToSave.gpsPrisLe || null,
      totalHeures: dataToSave.totalHeures || null,
      journaliers: dataToSave.journaliers || null,
      dateDebut: dataToSave.dateDebut || null,
      dateCloture: dataToSave.dateCloture || null,
    });
    const dataBase64 = btoa(unescape(encodeURIComponent(dataJSON)));

    // Préparation de l'objet pour le serveur
    const dataForServer = {
      interventionNumber: baseData.numeroIntervention || baseData.interventionNumber,
      clientId: baseData.clientId || clientId,
      donneesJson: {
  machines: dataToSave.machines || [],
  gpsLat: dataToSave.gpsLat || null,
  gpsLng: dataToSave.gpsLng || null,
  gpsPrisLe: dataToSave.gpsPrisLe || null,
  totalHeures: dataToSave.totalHeures || null,
  journaliers: dataToSave.journaliers || null,
  dateDebut: dataToSave.dateDebut || null,
  dateCloture: dataToSave.dateCloture || null,
},
      status: dataToSave.statut || 'EN_COURS',
      chefDeChantierId: dataToSave.chefDeChantierId || null,
      chefDeChantierNom: dataToSave.chefDeChantierNom || null,
      gpsValidated: !!(dataToSave.gpsLat && dataToSave.gpsLng),
      updatedAt: dataToSave.updatedAt
    };

    // Mise à jour locale optimiste
    installationDataRef.current = dataToSave;
    setInstallationData(dataToSave);

    console.log("📤 Envoi au serveur...", { machines: dataToSave.machines?.length, status: dataForServer.status });

    // Envoi réseau
    await api.entities.montages.update(effectiveMontageId, dataForServer);

    // GET immédiat pour vérifier ET confirmer l'écriture
    try {
      const freshMontage = await api.entities.montages.get(effectiveMontageId);
      if (freshMontage?.updatedAt) {
        dataToSave.updatedAt = freshMontage.updatedAt;
        installationDataRef.current = dataToSave;
        setInstallationData(dataToSave);
      }
      // Vérification explicite que photos[0] a bien été persisté
      if (!freshMontage?.donneesJson?.machines) {
        console.error('❌ WRITE FAILED: photos[0] absent après update – retry forcé');
        // Rafraîchir le token et retenter une seule fois
        await api.auth.refreshUser();
        await api.entities.montages.update(effectiveMontageId, dataForServer);
        console.log('✅ Retry après refresh token réussi');
      }
    } catch (e) {
      console.warn('⚠️ GET post-save échoué:', e);
    }

    console.log("✅ Sauvegarde réussie !");
    return dataToSave;

  } catch (e) {
    console.error('❌ [iPhone] Erreur sauvegarde:', e);
    alert('Erreur de connexion iPhone : ' + (e instanceof Error ? e.message : 'Inconnue'));
    throw e;
  } finally {
    // Réactiver le polling après un court délai
setTimeout(() => { isSavingRef.current = false; }, 3000);  }
};

  const handleSaveAndReturn = async () => {
    await saveMontage({});
    onNavigate('client-detail', { clientId });
  };

  const handlePrendreGPS = async () => {
    try {
      const pos = await getCurrentPosition();
      await saveMontage({
        gpsLat: pos.coords.latitude,
        gpsLng: pos.coords.longitude,
        gpsPrisLe: new Date().toISOString()
      });
      alert('✅ Point GPS enregistré');
    } catch (error) {
      alert('❌ Impossible de récupérer la position GPS');
    }
  };

  const handleSetChefChantier = async (chefId: string) => {
    const chef = utilisateurs?.find((u: any) => u._id === chefId);
    if (chef) {
      await saveMontage({
        chefDeChantierId: chef._id,
        chefDeChantierNom: `${chef.prenom || ''} ${chef.nom || ''}`.trim()
      });
    }
  };

  const calculerTotalMachine = (machine: any): number => {
    if (!machine.heuresParTechnicien) return 0;
    return machine.heuresParTechnicien.reduce((total: number, tech: any) => {
      return total + (tech.taches || []).reduce((sum: number, t: any) => sum + (t.heures || 0), 0);
    }, 0);
  };

  const handleGeneratePDF = async () => {
    try {
      const { generateInstallationReportPDF } = await import('../../utils/pdfGenerator');
      
      const pdfData = {
        installationData,
        client,
        machines: allMachines.filter((m: any) => 
          installationData.machines.some((im: any) => im.machineId === m._id)
        ),
        intervention: { 
          dateDebut: installationData.dateDebut,
          dateFin: installationData.dateCloture,
          type: 'INSTALLATION'
        },
        responsableTechnique: currentUser
      };

      const doc = await generateInstallationReportPDF(pdfData);
      doc.save(`Installation_${installationData.numeroIntervention}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('❌ Erreur PDF:', error);
      alert('❌ Erreur génération PDF');
    }
  };

  // Vérifie que chaque machine a au moins un technicien avec des heures saisies.
  // Empêche la clôture si un technicien n'a pas encore validé ses tâches.
  const tousLesTechniciensOntSaisi = (): boolean => {
    const machines = installationData?.machines || [];
    if (machines.length === 0) return false;
    return machines.every((machine: any) => {
      const techniciens = machine.heuresParTechnicien || [];
      return techniciens.length > 0 && techniciens.every((tech: any) =>
        (tech.taches || []).some((t: any) => (t.heures || 0) > 0)
      );
    });
  };

  const handleClose = async () => {
    // Bloquer la clôture définitive si des techniciens n'ont pas encore saisi leurs heures
    if (!tousLesTechniciensOntSaisi()) {
      alert('⚠️ Clôture impossible : tous les techniciens doivent avoir saisi leurs heures sur chaque machine avant de clôturer.');
      return;
    }
    if (!confirm('Clôturer définitivement ce montage ?')) return;
    setIsClosing(true);

    try {
      const machines = installationData?.machines || [];
      let totalHeures = 0;
      const resumeParTech: any[] = [];
      const resumeParMachine: any[] = [];
      const resumeParTache: Record<string, { description: string; totalHeures: number }> = {};

      machines.forEach((machine: any) => {
        let totalMachine = 0;
        const techsSurMachine: any[] = [];

        (machine.heuresParTechnicien || []).forEach((tech: any) => {
          let totalTech = 0;

          (tech.taches || []).forEach((tache: any) => {
            const h = tache.heures || 0;
            totalTech += h;
            totalMachine += h;
            totalHeures += h;

            if (!resumeParTache[tache.description]) {
              resumeParTache[tache.description] = { description: tache.description, totalHeures: 0 };
            }
            resumeParTache[tache.description].totalHeures += h;
          });

          techsSurMachine.push({
            technicienId: tech.technicienId,
            technicienNom: tech.technicienNom,
            heures: totalTech
          });

          let existingTech = resumeParTech.find(t => t.technicienId === tech.technicienId);
          if (!existingTech) {
            existingTech = {
              technicienId: tech.technicienId,
              nom: tech.technicienNom,
              totalHeures: 0,
              parMachine: []
            };
            resumeParTech.push(existingTech);
          }
          existingTech.totalHeures += totalTech;
          existingTech.parMachine.push({
            machineId: machine.machineId,
            machineNom: machine.nom,
            heures: totalTech
          });
        });

        resumeParMachine.push({
          machineId: machine.machineId,
          nom: machine.nom,
          totalHeures: totalMachine,
          parTechnicien: techsSurMachine
        });
      });

      const journaliers = {
        parTechnicien: resumeParTech,
        parMachine: resumeParMachine,
        parTache: Object.values(resumeParTache)
      };

      const updates = {
        statut: 'TERMINEE',
        journaliers,
        totalHeures,
        dateCloture: new Date().toISOString()
      };

      const updatedData = await saveMontage(updates);

      await api.entities.interventions.update(interventionId, {
        statut: 'TERMINEE',
        dateFin: new Date().toISOString()
      });

      try {
        const { generateInstallationReportPDF } = await import('../../utils/pdfGenerator');
        
        const pdfData = {
          installationData: updatedData,
          client,
          machines: allMachines.filter((m: any) => 
            updatedData.machines.some((im: any) => im.machineId === m._id)
          ),
          intervention: { 
            dateDebut: updatedData.dateDebut,
            dateFin: updatedData.dateCloture,
            type: 'INSTALLATION'
          },
          responsableTechnique: currentUser
        };

        const doc = await generateInstallationReportPDF(pdfData);
        doc.save(`Installation_${updatedData.numeroIntervention}_${new Date().toISOString().split('T')[0]}.pdf`);

        // AJOUT : envoi reel du rapport au client par email
       const clientNotif = await sendClientInterventionNotification({
  clientId: clientId,
  interventionType: 'INSTALLATION',
  numeroIntervention: updatedData.numeroIntervention || '',
  dateIntervention: updatedData.dateDebut || new Date().toISOString(),
  pdfDoc: doc,
  machineName: updatedData.machines?.map((m: any) => m.nom).join(', '),
  technicienName: currentUser ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() : undefined,
  technicienId: currentUser?._id
});
        if (!clientNotif.skipped && !clientNotif.success) {
          console.warn('[Montage] Email client non envoyé:', clientNotif.error);
        }
      } catch (pdfError) {
        console.error('⚠️ Erreur PDF:', pdfError);
      }

   const techUser = currentUser?._id ? await api.entities.utilisateurs.get(currentUser._id) : null;
const reportResult = techUser?.sendEmailReport === false
  ? { success: false, skipped: true }
  : await sendInstallationReportToResponsable({
      installationData: updatedData,
      interventionId,
      clientId
    });
if (reportResult.success) {
  alert(
    `✅ Montage clôturé!\n\n` +
    `N° ${updatedData?.numeroIntervention}\n` +
    `Total: ${formatHeures(totalHeures)}\n` +
    `Machines: ${machines.length}\n\n` +
    `📧 Compte-rendu envoyé\n` +
    `📄 PDF téléchargé`
  );
} else if (reportResult.skipped) {
  alert(`✅ Montage clôturé!\n📄 PDF téléchargé\n(Envoi email désactivé)`);
} else {
  alert(`✅ Montage clôturé!\n⚠️ Erreur envoi`);
}

} catch (error) {
  console.error('❌ Erreur clôture:', error);
  alert(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
} finally {
  // Navigation toujours exécutée, même si le PDF ou l'email échouent (critique sur iOS)
  setIsClosing(false);
  onNavigate('client-detail', { clientId });
}
};
useEffect(() => {
  // Attendre la fin du chargement et que l'utilisateur soit identifié
  if (isLoadingMontage || !currentUser) return;

  const shouldCreate = !montageId && installationData === null;
  // Si une machine de référence est attendue, s'assurer qu'elle est chargée
  const canCreate = !machineId || allMachines.length > 0;
  
  if (shouldCreate && canCreate) {
    creerMontage();
  }
}, [isLoadingMontage, currentUser, montageId, installationData, allMachines.length]);
if (isLoadingMontage || !installationData || !montageId) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Chargement...</p>
    </div>
  );
}
  if (selectedMachineId) {
    const machine = installationData.machines?.find((m: any) => m.id === selectedMachineId);
    if (!machine) {
      setSelectedMachineId(null);
      return null;
    }

    return (
      <MachineTasksView
        machine={machine}
        currentUser={currentUser}
        installationData={{
          ...installationData,
          utilisateurs
        }}
        onBack={() => setSelectedMachineId(null)}
onSave={async (updatedMachine) => {
  isSavingRef.current = true;
  try {
    const baseMachines = installationDataRef.current?.machines || installationData?.machines || [];
    const machines = baseMachines.map((m: any) =>
      m.id === updatedMachine.id ? updatedMachine : m
    );
    await saveMontage({ machines });
  } catch (e) {
    console.error('❌ onSave échoué:', e);
    // L'alerte est déjà affichée dans saveMontage
  }
}}      />
    );
  }

  const machines = installationData.machines || [];
  const voitTout = currentUser?.permissions?.includes('admin_access');

  return (
    <div className="min-h-screen bg-gray-50">
      {machineGPS && installationData.statut !== 'TERMINEE' && (
        <GPSTrackingAlert
          machineId={montageId}
          machineLat={machineGPS.lat}
          machineLng={machineGPS.lng}
          techniciens={[]}
          currentUserId={currentUser?._id || ''}
        />
      )}

      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={handleSaveAndReturn}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-gray-800">
              📋 Installation - {installationData.numeroIntervention}
            </h1>
          </div>
          {installationData.statut === 'TERMINEE' && (
            <Button
              onClick={handleGeneratePDF}
              className="bg-red-600 hover:bg-red-700 text-white text-sm flex items-center gap-2"
            >
              📄 Voir PDF
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 pb-24 space-y-4">
        {client && (
          <Card>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Client</p>
            <p className="text-lg font-bold text-gray-800">{client.nom}</p>
            {client.adresse && <p className="text-sm text-gray-600">{client.adresse}</p>}
            
            {referenceMachine && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Machine de référence</p>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-800">{referenceMachine.nom}</span>
                  {referenceMachine.typeMachine && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                      {typeof referenceMachine.typeMachine === 'object' 
                        ? referenceMachine.typeMachine.nom 
                        : referenceMachine.typeMachine}
                    </span>
                  )}
                </div>
                {referenceMachine.numeroSerie && (
                  <p className="text-sm text-gray-600 mt-1">
                    N° Série: {referenceMachine.numeroSerie}
                  </p>
                )}
              </div>
            )}
            
            <span className={`inline-block mt-3 text-xs font-semibold px-2 py-0.5 rounded-full ${
              installationData.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {installationData.statut === 'TERMINEE' ? 'Terminé' : 'En cours'}
            </span>
          </Card>
        )}

        {voitTout && (
          <Card>
            <h2 className="font-semibold text-gray-800 mb-3">👷 Chef de chantier</h2>
            {installationData.chefDeChantierId ? (
              <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="text-sm font-bold text-orange-800">{installationData.chefDeChantierNom}</span>
                {installationData.statut !== 'TERMINEE' && (
                  <button onClick={() => saveMontage({ chefDeChantierId: null, chefDeChantierNom: null })}>
                    <X size={16} className="text-orange-400 hover:text-red-500" />
                  </button>
                )}
              </div>
            ) : installationData.statut !== 'TERMINEE' ? (
              <select
                value=""
                onChange={(e) => handleSetChefChantier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Sélectionner un chef...</option>
                {utilisateurs?.map((u: any) => (
                  <option key={u._id} value={u._id}>
                    {u.prenom} {u.nom} - {u.role}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500">Aucun chef de chantier désigné</p>
            )}
          </Card>
        )}

        {voitTout && (
          <Card>
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin size={18} /> GPS du chantier
            </h2>
            {!installationData.gpsLat ? (
              installationData.statut !== 'TERMINEE' ? (
                <Button onClick={handlePrendreGPS} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <MapPin size={18} /> 📍 Prendre le point GPS
                </Button>
              ) : (
                <p className="text-sm text-gray-500">Aucun point GPS enregistré</p>
              )
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Lat:</span> {installationData.gpsLat.toFixed(6)} &nbsp;
                  <span className="font-medium">Lng:</span> {installationData.gpsLng.toFixed(6)}
                </p>
                <p className="text-xs text-gray-500">
                  Pris le {new Date(installationData.gpsPrisLe).toLocaleString('fr-FR')}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${installationData.gpsLat},${installationData.gpsLng}`, '_blank')}
                  className="text-sm flex items-center gap-1"
                >
                  🗺️ Ouvrir dans Maps
                </Button>
              </div>
            )}
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-lg">🏭 Machines</h2>
            {installationData.statut !== 'TERMINEE' && (
              <Button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddMachine(true);
                }} 
                variant="secondary" 
                className="text-sm"
              >
                <Plus size={16} /> Ajouter machine
              </Button>
            )}
          </div>

          {machines.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              Aucune machine. Cliquez sur "Ajouter machine".
            </p>
          ) : (
            <div className="space-y-3">
              {machines.map((machine: any) => {
                const totalHeures = calculerTotalMachine(machine);
                const nbTechniciens = machine.heuresParTechnicien?.length || 0;
                const isReferenceMachine = machine.machineId === referenceMachine?._id;
                const isTerminee = installationData.statut === 'TERMINEE';

                return (
                  <div
                    key={machine.id}
                    onClick={() => !isTerminee && setSelectedMachineId(machine.id)}
                    className={`p-4 border rounded-lg transition bg-white ${
                      isTerminee 
                        ? 'cursor-default' 
                        : 'cursor-pointer hover:shadow-md'
                    } ${
                      isReferenceMachine 
                        ? 'border-blue-400 bg-blue-50' 
                        : isTerminee
                        ? 'border-gray-200'
                        : 'border-gray-200 hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isReferenceMachine && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded">
                              RÉFÉRENCE
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                            machine.relationType === 'MAITRE' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {machine.relationType}
                          </span>
                          <h3 className="font-bold text-gray-900">{machine.nom}</h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {machine.typeMachineNom} {machine.serie && `• N° ${machine.serie}`}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-gray-600">
                            ⏱️ <strong>{formatHeures(totalHeures)}</strong>
                          </span>
                          <span className="text-sm text-gray-600">
                            👷 <strong>{nbTechniciens}</strong> technicien(s)
                          </span>
                        </div>
                      </div>
                      {!isTerminee && (
                        <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                          Voir tâches →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {installationData.statut === 'TERMINEE' && installationData.journaliers && (
          <Card>
            <h2 className="font-semibold text-gray-800 mb-3">📊 Résumé</h2>
            <div className="space-y-2">
              {installationData.journaliers.parTechnicien.map((t: any, i: number) => (
                <div key={i} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{t.nom}</span>
                  <span className="text-sm font-bold text-blue-600">{formatHeures(t.totalHeures)}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-gray-200 mt-3 flex justify-between">
              <span className="font-semibold">Total global</span>
              <span className="font-bold text-blue-600">{formatHeures(installationData.totalHeures || 0)}</span>
            </div>
          </Card>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-xl mx-auto flex gap-3">
          {installationData.statut === 'TERMINEE' ? (
            <Button 
              variant="secondary" 
              onClick={handleSaveAndReturn} 
              className="flex-1"
            >
              <ArrowLeft size={16} /> Retour
            </Button>
          ) : (
            <>
              <Button 
                variant="secondary" 
                onClick={handleSaveAndReturn} 
                className="flex-1"
              >
                <Save size={16} /> Enregistrer
              </Button>
              <Button
                onClick={handleClose}
                disabled={isClosing}
                className={`flex-1 ${isClosing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white`}
              >
                {isClosing ? (
  '⏳ Clôture...'
) : (
  <>
    <CheckCircle size={16} />
    {' '}Clôturer
  </>
)}
              </Button>
            </>
          )}
        </div>
      </div>

       {showAddMachine && (
        <AddMachineModal
          clientId={clientId}
          allMachines={allMachines}
          montageExistingMachines={machines}
          onClose={() => setShowAddMachine(false)}
          onAdd={async (newMachine) => {
            // FIX MOBILE : On part de la liste affichée (installationData.machines)
            // et non du ref qui peut être vide.
            let finalMachines = [...(installationData?.machines || [])];

            // Tenter de récupérer les machines des autres pour les fusionner
            try {
              const freshMontage = await api.entities.montages.get(montageId!);
              const serverMachines = freshMontage?.sections?.machines || [];

              const newOnServer = serverMachines.filter((sm: any) => 
                !finalMachines.some((lm: any) => lm.id === sm.id)
              );
              finalMachines = [...finalMachines, ...newOnServer];
            } catch (e) {
              console.warn("⚠️ Offline mode: Pas de fusion avec le serveur.");
            }

            // Ajout de la nouvelle machine
            finalMachines = [...finalMachines, newMachine];

            // Sauvegarde
            await saveMontage({ machines: finalMachines });

            setShowAddMachine(false);
            setSelectedMachineId(newMachine.id);
          }}
        />
      )}
    </div>
  );
}