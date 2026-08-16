// useMaintenanceMonitoring.ts
// Moteur central de surveillance maintenance
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface MaintenanceAlert {
  machineId: string;
  machineName: string;
  machineType?: string;        // Type de machine (VMS, V300, CMS…)
  groupId?: string;            // ID du groupe de surveillance (ex: "VMS", "CMS")
  groupName?: string;          // Nom affiché du groupe (ex: "Groupe VMS")
  clientId: string;
  clientName: string;
  maintenanceType: string;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string;
  periodicity: string;
  spareParts: string[];
  status: '🟢' | '🟠' | '🔴';
  daysUntilMaintenance: number;
}

// Groupe de surveillance : regroupe des types de machines et définit
// quels rôles peuvent voir les alertes de ce groupe.
export interface MonitoringGroup {
  id: string;             // Identifiant unique (ex: "VMS", "CMS")
  name: string;           // Nom affiché (ex: "Groupe VMS")
  machineTypes: string[]; // Types de machines surveillés (ex: ["VMS","V300","V310","V320"])
  visibleToRoles: string[]; // Rôles qui voient ce groupe dans leur écran
}

export interface MonitoringConfig {
  greenThreshold: number;  // jours (défaut: 60)
  orangeThreshold: number; // jours (défaut: 30)
  redThreshold: number;    // jours (défaut: 14)
  emailEnabled: boolean;
  emailRecipient: string;
  maintenanceTypes: string[];
  // Groupes de surveillance configurables
  groups: MonitoringGroup[];
}

// Groupes par défaut : VMS et CMS
const DEFAULT_GROUPS: MonitoringGroup[] = [
  {
    id: 'VMS',
    name: 'Groupe VMS',
    machineTypes: ['VMS', 'V300', 'V310', 'V320'],
    visibleToRoles: [
      'ADMINISTRATEUR', 'RESPONSABLE_TECHNIQUE',
      'CHEF_TECHNICIEN_VMS', 'TECHNICIEN_VMS',
      'Technicien VMS', 'Chef Technicien VMS'
    ]
  },
  {
    id: 'CMS',
    name: 'Groupe CMS',
    machineTypes: ['CMS'],
    visibleToRoles: [
      'ADMINISTRATEUR', 'RESPONSABLE_TECHNIQUE',
      'CHEF_TECHNICIEN_CMS', 'TECHNICIEN_CMS',
      'Technicien CMS', 'Chef Technicien CMS'
    ]
  }
];

const DEFAULT_CONFIG: MonitoringConfig = {
  greenThreshold: 60,   // Vert : jusqu'à 60j (2 mois)
  orangeThreshold: 30,  // Orange : jusqu'à 30j
  redThreshold: 14,     // Rouge : moins de 14j
  emailEnabled: false,
  emailRecipient: '',
  maintenanceTypes: ['Entretien standard', 'Révision complète', 'Vérification'],
  groups: DEFAULT_GROUPS
};

export function useMaintenanceMonitoring() {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [config, setConfig] = useState<MonitoringConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);

  // Calcul du statut basé sur les jours restants
  const calculateStatus = useCallback((daysUntil: number): '🟢' | '🟠' | '🔴' | null => {
    if (daysUntil < 0) return '🔴';           // En retard → rouge
    if (daysUntil <= 14) return '🔴';         // Moins de 14j → rouge
    if (daysUntil <= 29) return '🟠';         // 15 à 29j → orange
    if (daysUntil <= config.greenThreshold) return '🟢'; // 30j+ → vert
    return null; // Plus de greenThreshold → pas d'alerte
  }, [config]);

  // Calcul des jours jusqu'à la prochaine maintenance
  const calculateDaysUntil = (nextDate: string): number => {
    const next = new Date(nextDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    next.setHours(0, 0, 0, 0);
    return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Surveillance de toutes les machines
  const monitorAllMachines = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Récupérer toutes les machines
      const machinesResult = await api.entities.machines.list({
        sort: { createdAt: -1 }
      });
      const machines = machinesResult.list || [];

      // 2. Récupérer tous les clients
      const clientsResult = await api.entities.clients.list({});
      const clients = clientsResult.list || [];
      const clientsMap = new Map(clients.map(c => [c._id, c]));

      // 3. Calculer les alertes pour chaque machine
      const activeAlerts: MaintenanceAlert[] = [];

      // 3b. Récupérer toutes les interventions d'entretien terminées
      const interventionsResult = await api.entities.interventions.list({
        where: { type: 'Entretien', statut: 'termine' },
        sort: { dateIntervention: -1 },
        limit: 1000
      });
      const interventions = interventionsResult.list || [];

      for (const machine of machines) {
        // Priorité 1 : dernière intervention réelle en base
        const lastIntervention = interventions
          .filter((i: any) => i.machineId === machine._id ||
                              (Array.isArray(i.machineIds) && i.machineIds.includes(machine._id)))
          .sort((a: any, b: any) => new Date(b.dateIntervention).getTime() - new Date(a.dateIntervention).getTime())[0];

        // Priorité 2 : date saisie manuellement sur la machine
        const lastDateStr = lastIntervention?.dateIntervention
          || machine.dernierEntretien
          || machine.dateDernierEntretien; // compat ancienne clé

        if (!lastDateStr) continue;

        // ✅ Si une intervention réelle existe et que la machine n'est pas à jour → mettre à jour silencieusement
        if (lastIntervention && lastIntervention.dateIntervention !== machine.dernierEntretien) {
          api.entities.machines.update(machine._id, {
            dernierEntretien: lastIntervention.dateIntervention
          }).catch(() => {}); // silencieux, non bloquant
        }

        const lastDate = new Date(lastDateStr);
        const periodeEntretien = machine.periodeEntretien || 12;
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + periodeEntretien);

        const daysUntil = calculateDaysUntil(nextDate.toISOString());
        const status = calculateStatus(daysUntil);

        // Ne garder que les machines avec alerte active
        if (!status) continue;

        const client = clientsMap.get(machine.clientId);

        // Trouver le groupe de surveillance correspondant au type de machine
        const mt = (machine.machineType || '').trim().toUpperCase();
        const matchedGroup = config.groups.find(g =>
          g.machineTypes.some(t => t.toUpperCase() === mt)
        );

        activeAlerts.push({
          machineId: machine._id,
          machineName: machine.nom || machine.numeroSerie || 'Machine sans nom',
          machineType: machine.machineType || undefined,
          groupId: matchedGroup?.id,
          groupName: matchedGroup?.name,
          clientId: machine.clientId,
          clientName: client?.nom || client?.nomFerme || 'Client inconnu',
          maintenanceType: 'Entretien standard',
          lastMaintenanceDate: lastDateStr,
          nextMaintenanceDate: nextDate.toISOString(),
          periodicity: `${periodeEntretien} mois`,
          spareParts: [],
          status,
          daysUntilMaintenance: daysUntil
        });
      }

      // Trier par urgence (rouge > orange > vert, puis par date)
      activeAlerts.sort((a, b) => {
        const statusOrder = { '🔴': 0, '🟠': 1, '🟢': 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return a.daysUntilMaintenance - b.daysUntilMaintenance;
      });

      setAlerts(activeAlerts);
    } catch (error) {
      console.error('Erreur surveillance maintenance:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateStatus, config.groups]);

  // Charger la configuration
  const loadConfig = useCallback(async () => {
    try {
      setConfig(DEFAULT_CONFIG);
    } catch (error) {
      console.error('Erreur chargement config:', error);
    }
  }, []);

  // Sauvegarder la configuration
  const saveConfig = useCallback(async (newConfig: Partial<MonitoringConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);
      await monitorAllMachines();
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      throw error;
    }
  }, [config, monitorAllMachines]);

  // Obtenir le statut d'une machine spécifique
  const getMachineStatus = useCallback((machineId: string): '🟢' | '🟠' | '🔴' | null => {
    const alert = alerts.find(a => a.machineId === machineId);
    return alert?.status || null;
  }, [alerts]);

  // Obtenir toutes les alertes d'un client
  const getClientAlerts = useCallback((clientId: string): MaintenanceAlert[] => {
    return alerts.filter(a => a.clientId === clientId);
  }, [alerts]);

  // Filtrer les alertes visibles pour un utilisateur selon ses rôles.
  // Admin et Responsable Technique voient tout.
  // Les autres ne voient que les groupes qui leur sont assignés.
  const getAlertsForUser = useCallback((userRoles: string[]): MaintenanceAlert[] => {
    const isAdminOrManager = userRoles.some(r =>
      ['ADMINISTRATEUR', 'RESPONSABLE_TECHNIQUE'].includes(r)
    );
    if (isAdminOrManager) return alerts;

    const visibleGroupIds = config.groups
      .filter(g => g.visibleToRoles.some(vr => userRoles.includes(vr)))
      .map(g => g.id);

    return alerts.filter(a =>
      // Machine sans groupe → visible par tous (non classifiées)
      !a.groupId || visibleGroupIds.includes(a.groupId)
    );
  }, [alerts, config.groups]);

  // Envoi email
  const sendEmailNotification = useCallback(async (alert: MaintenanceAlert) => {
    if (!config.emailEnabled || !config.emailRecipient) {
      console.log('Email désactivé ou destinataire manquant');
      return;
    }
    try {
      console.log('Envoi email pour:', alert);
    } catch (error) {
      console.error('Erreur envoi email:', error);
    }
  }, [config]);

  // Suppression d'une alerte (réservé admin/responsable technique)
  const dismissAlert = useCallback(async (machineId: string) => {
    try {
      const machine = await api.entities.machines.list({
        filter: { _id: machineId }
      });
      if (machine.list.length > 0) {
        await api.entities.machines.update(machineId, {
          dateDernierEntretien: new Date().toISOString()
        });
        await monitorAllMachines();
      }
    } catch (error) {
      console.error('Erreur suppression alerte:', error);
      throw error;
    }
  }, [monitorAllMachines]);

  // Chargement initial
  useEffect(() => {
    loadConfig();
    monitorAllMachines();
  }, []);

  return {
    alerts,
    config,
    loading,
    monitorAllMachines,
    saveConfig,
    getMachineStatus,
    getClientAlerts,
    getAlertsForUser,
    sendEmailNotification,
    dismissAlert
  };
}