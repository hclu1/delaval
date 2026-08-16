// useCommissioningProtocol.ts
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface Verification {
  id: string;
  text: string;
  checked: boolean;
  notes: string;
  category?: string;
}

export interface ProtocolSession {
  technicien: string;
  technicienId?: string;
  numeroTechnicien?: string;
  date: string;
  started: string;
  lastSaved?: string;
  interventionId?: string;
  numeroIntervention?: string;
}

export interface ProtocolData {
  session: ProtocolSession;
  verifications: {
    avantMiseEnRoute: Verification[];
    misEnRoute: Verification[];
    montrerClient: Verification[];
    custom: Verification[];
  };
  progress: {
    total: number;
    completed: number;
  };
  status?: 'draft' | 'in_progress' | 'completed';
}

// Structure par défaut (VIDE / A ZERO)
const INITIAL_VERIFICATIONS = {
  avantMiseEnRoute: [
    { id: 'amr_1', text: 'Niveau de vide', checked: false, notes: '', category: 'general' },
    { id: 'amr_2', text: 'Faire un lavage robot(s)', checked: false, notes: '', category: 'general' },
    { id: 'amr_3', text: 'Faire un lavage BVV', checked: false, notes: '', category: 'general' },
    { id: 'amr_4', text: 'Assister à la vidange du BVV', checked: false, notes: '', category: 'general' },
    { id: 'amr_5', text: 'Faire un lavage tank', checked: false, notes: '', category: 'general' },
    { id: 'amr_6', text: 'Vérifier les descentes d\'aliments', checked: false, notes: '', category: 'general' },
    { id: 'amr_7', text: 'Passer une vache en traite', checked: false, notes: '', category: 'general' },
    { id: 'amr_8', text: 'Faire un calibrage (bien faire tourner les vis)', checked: false, notes: '', category: 'general' },
    { id: 'amr_9', text: 'BVV : vérifier pincement sur les tuyaux', checked: false, notes: '', category: 'general' },
    { id: 'amr_10', text: 'BVV : Les sortir du fourreau pour amorcer les lessives', checked: false, notes: '', category: 'general' },
    { id: 'amr_11', text: 'Supprimer la mise à l\'air progressive', checked: false, notes: '', category: 'general' },
    { id: 'amr_12', text: 'Verin gripper : à coller', checked: false, notes: '', category: 'general' },
    { id: 'amr_13', text: 'Verin gripper : Limer le guide', checked: false, notes: '', category: 'general' },
    { id: 'amr_14', text: 'Coller les vis de la main', checked: false, notes: '', category: 'general' },
    { id: 'amr_15', text: 'Changer les flotteurs +circlips', checked: false, notes: '', category: 'general' },
    { id: 'amr_16', text: 'Coller la vanne de coupure de vide', checked: false, notes: '', category: 'general' },
    { id: 'amr_17', text: 'Vérifier l\'armoire de la PAV', checked: false, notes: '', category: 'general' },
    { id: 'amr_18', text: 'Régler le disjoncteur moteur', checked: false, notes: '', category: 'general' },
    { id: 'amr_19', text: 'Vérifier l\'installation de MyFarm', checked: false, notes: '', category: 'general' },
    { id: 'amr_20', text: 'Equipement/V300/général - Passer en mode manuel : cocher lorsque la vache entre dans la stalle', checked: false, notes: '', category: 'ordi' },
    { id: 'amr_21', text: 'Equipement/V300/général - Lavage trayons : cocher léger', checked: false, notes: '', category: 'ordi' },
    { id: 'amr_22', text: 'Lavage après traite - Déviation de lait : 2-rinçage local (partout)', checked: false, notes: '', category: 'ordi' },
    { id: 'amr_23', text: 'Lavage après traite - Actions lorsque la stalle est vide : 1- système rinçage', checked: false, notes: '', category: 'ordi' },
    { id: 'amr_24', text: 'Lavage après traite - !! si plusieurs stalles recopier et vérifier que tout est paramétré de manière identique', checked: false, notes: '', category: 'ordi' },
    { id: 'amr_25', text: 'Déplacement des animaux - Zone avant station = aire attente', checked: false, notes: '', category: 'ordi' },
    { id: 'amr_26', text: 'Déplacement des animaux - Zone après station = porte de tri VMS si existante ou Aire attente si porte intelligente', checked: false, notes: '', category: 'ordi' },
    { id: 'amr_27', text: 'VMS active', checked: false, notes: '', category: 'ams' },
    { id: 'amr_28', text: 'Lait', checked: false, notes: '', category: 'ams' },
    { id: 'amr_29', text: 'Tank ou déviation du lait', checked: false, notes: '', category: 'ams' },
    { id: 'amr_30', text: 'Autoriser les permissions de traite automatique', checked: false, notes: '', category: 'ams' },
    { id: 'amr_31', text: 'Configurer les mamelles si nécessaire', checked: false, notes: '', category: 'ams' },
    { id: 'amr_32', text: 'Régler les longueurs d\'auge (attention enregistrement sur tactile)', checked: false, notes: '', category: 'ams' },
    { id: 'amr_33', text: 'Mettre de l\'aliment disponible', checked: false, notes: '', category: 'ams' }
  ],
  misEnRoute: [
    { id: 'mer_1', text: 'Refaire le tour des paramètres VC Connect', checked: false, notes: '' },
    { id: 'mer_2', text: 'Activer les options qui ne le seraient pas encore', checked: false, notes: '' },
    { id: 'mer_3', text: 'Vérifier les fuites', checked: false, notes: '' },
    { id: 'mer_4', text: 'Vérifier les longueurs de canalisations', checked: false, notes: '' },
    { id: 'mer_5', text: 'Activer les 3 grands lavages', checked: false, notes: '' },
    { id: 'mer_6', text: 'Vérifier la temporisation des portes', checked: false, notes: '' },
    { id: 'mer_7', text: 'Vérifier le centrage des trayons', checked: false, notes: '' },
    { id: 'mer_8', text: 'Tubes IRO dans les bidons de lessives', checked: false, notes: '' },
    { id: 'mer_9', text: 'Pompes de lessive : étanchéifier les raccords', checked: false, notes: '' },
    { id: 'mer_10', text: 'Vérifier la caisse de dépannage (faire une liste des pièces)', checked: false, notes: '' }
  ],
  montrerClient: [
    { id: 'mc_1', text: 'Changement de manchons/tuyaux/pinces/cordes', checked: false, notes: '' },
    { id: 'mc_2', text: 'Redémarrage ordi + PC', checked: false, notes: '' },
    { id: 'mc_3', text: 'Niveau Huile PAV', checked: false, notes: '' },
    { id: 'mc_4', text: 'Nettoyage (filtre variateur PAV) + compresseur', checked: false, notes: '' },
    { id: 'mc_5', text: 'Mode manuel', checked: false, notes: '' },
    { id: 'mc_6', text: 'Lavage trayons', checked: false, notes: '' },
    { id: 'mc_7', text: 'Lavage stalle', checked: false, notes: '' },
    { id: 'mc_8', text: 'Déplacement des animaux', checked: false, notes: '' },
    { id: 'mc_9', text: 'Paramètres AMS/Général', checked: false, notes: '' },
    { id: 'mc_10', text: 'Permissions de traite automatiques', checked: false, notes: '' },
    { id: 'mc_11', text: 'Configuration de la mamelle', checked: false, notes: '' },
    { id: 'mc_12', text: 'Aliments disponibles : fiche animal (vache par vache) ou attribution par lot', checked: false, notes: '' }
  ],
  custom: []
};

function generateInterventionNumber(numeroTechnicien: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const techNum = numeroTechnicien.padStart(3, '0');
  return `${year}${month}${day}${hour}${techNum}`;
}

export function useCommissioningProtocol(interventionId?: string, currentUser?: any, isNewIntervention: boolean = false) {
  const [data, setData] = useState<ProtocolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProtocol();
  }, [interventionId, isNewIntervention]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      saveProtocolToLocal();
    }, 30000);
    return () => clearInterval(interval);
  }, [data]);

  const loadProtocol = async () => {
    setLoading(true);
    try {
      // CAS 1 : RESET EXPLICITE DEMANDE
      if (isNewIntervention) {
        console.log('🆕 NOUVELLE INTERVENTION DEMANDEE : RESET COMPLET');
        createNewProtocol(interventionId);
        setLoading(false);
        return;
      }
      
      // CAS 2 : CHARGEMENT NORMAL (ON IGNORE L'ANCIEN PROTOCOLE POUR FORCER LE RESET)
      // NOTE : C'est ici qu'on force la remise à zéro si besoin.
      if (interventionId) {
        const intervention = await api.entities.interventions.get(interventionId);
        
        // On regarde s'il y a des données, mais on peut choisir de les ignorer.
        // Pour l'instant, on charge ce qu'il y a.
        if (intervention?.protocolData) {
          console.log('📥 Chargement protocole existant depuis MongoDB:', interventionId);
          setData(intervention.protocolData);
          setLoading(false);
          return;
        }
      }
      
      // CAS 3 : BROUILLON LOCAL
      const storageKey = interventionId ? `protocol_${interventionId}` : 'protocol_draft';
      const saved = localStorage.getItem(storageKey);
      
      if (saved) {
        console.log('💾 Chargement depuis localStorage:', storageKey);
        setData(JSON.parse(saved));
      } else {
        createNewProtocol(interventionId);
      }
    } catch (error) {
      console.error('❌ Erreur chargement protocole:', error);
      createNewProtocol(interventionId); // Fallback safe
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour forcer un nouveau protocole vide (RESET)
  const forceResetProtocol = () => {
    console.log('🔄 FORCER LE RESET DU PROTOCOLE');
    createNewProtocol(interventionId);
  };

  const saveProtocolToLocal = () => {
    if (!data) return;
    const storageKey = data.session.interventionId ? `protocol_${data.session.interventionId}` : 'protocol_draft';
    const updatedData = {
      ...data,
      session: {
        ...data.session,
        lastSaved: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }
    };
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    setData(updatedData);
  };
  
  // Renommage de l'ancienne fonction
  const saveProtocol = () => {
    saveProtocolToLocal();
  };

  const updateSession = (field: keyof ProtocolSession, value: string) => {
    if (!data) return;
    setData({
      ...data,
      session: { ...data.session, [field]: value }
    });
  };

  const toggleVerification = (section: keyof ProtocolData['verifications'], id: string) => {
    if (!data) return;
    const updated = {
      ...data,
      verifications: {
        ...data.verifications,
        [section]: data.verifications[section].map(v =>
          v.id === id ? { ...v, checked: !v.checked } : v
        )
      }
    };
    
    const completed = Object.values(updated.verifications)
      .flat()
      .filter(v => v.checked).length;
    
    updated.progress.completed = completed;
    setData(updated);
  };

  const updateNotes = (section: keyof ProtocolData['verifications'], id: string, notes: string) => {
    if (!data) return;
    setData({
      ...data,
      verifications: {
        ...data.verifications,
        [section]: data.verifications[section].map(v =>
          v.id === id ? { ...v, notes } : v
        )
      }
    });
  };

  const addCustomVerification = (text: string, section: keyof ProtocolData['verifications'], notes: string = '') => {
    if (!data) return;
    const newVerif: Verification = {
      id: `custom_${Date.now()}`,
      text,
      checked: false,
      notes,
      category: 'custom'
    };
    
    const updated = {
      ...data,
      verifications: {
        ...data.verifications,
        [section]: [...data.verifications[section], newVerif]
      },
      progress: {
        ...data.progress,
        total: data.progress.total + 1
      }
    };
    setData(updated);
  };

  const removeCustomVerification = (section: keyof ProtocolData['verifications'], id: string) => {
    if (!data) return;
    const updated = {
      ...data,
      verifications: {
        ...data.verifications,
        [section]: data.verifications[section].filter(v => v.id !== id)
      },
      progress: {
        ...data.progress,
        total: data.progress.total - 1
      }
    };
    setData(updated);
  };

  const createNewProtocol = (targetInterventionId?: string) => {
    const technicienName = currentUser ? `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() : '';
    const numeroTechnicien = currentUser?.numeroTechnicien || '000';
    const numeroIntervention = generateInterventionNumber(numeroTechnicien);
    
    const newData: ProtocolData = {
      session: {
        technicien: technicienName,
        technicienId: currentUser?._id,
        numeroTechnicien,
        numeroIntervention,
        date: new Date().toISOString().split('T')[0],
        started: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        interventionId: targetInterventionId || interventionId
      },
      verifications: JSON.parse(JSON.stringify(INITIAL_VERIFICATIONS)), // Deep clone = TOUT A ZERO
      progress: {
        total: INITIAL_VERIFICATIONS.avantMiseEnRoute.length + 
               INITIAL_VERIFICATIONS.misEnRoute.length + 
               INITIAL_VERIFICATIONS.montrerClient.length,
        completed: 0
      },
      status: 'draft'
    };
    setData(newData);
    console.log('✅ Nouveau protocole créé (RESET) avec N°:', numeroIntervention);
  };
  
  const clearProtocol = () => {
    const storageKey = data?.session.interventionId ? `protocol_${data.session.interventionId}` : 'protocol_draft';
    localStorage.removeItem(storageKey);
    loadProtocol();
  };
  
  const saveToDatabase = async (status: 'in_progress' | 'completed') => {
    if (!data) throw new Error('Aucune donnée à sauvegarder');
    if (!data.session.interventionId) throw new Error('Aucune intervention liée');
    
    const updatedData = {
      ...data,
      status,
      session: {
        ...data.session,
        lastSaved: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }
    };

    try {
      console.log(`💾 Enregistrement dans MongoDB (Statut: ${status})...`);
      
      // Mise à jour de l'intervention
      await api.entities.interventions.update(data.session.interventionId, {
        protocolData: updatedData,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Sauvegarde MongoDB réussie.');
      setData(updatedData);
      return updatedData;
    } catch (error) {
      console.error('❌ Erreur sauvegarde MongoDB:', error);
      throw error;
    }
  };
  
  const isAllChecked = () => {
    if (!data) return false;
    const allVerifications = [
      ...data.verifications.avantMiseEnRoute,
      ...data.verifications.misEnRoute,
      ...data.verifications.montrerClient
    ];
    return allVerifications.every(v => v.checked);
  };

  return {
    data,
    loading,
    updateSession,
    toggleVerification,
    updateNotes,
    addCustomVerification,
    removeCustomVerification,
    saveProtocol,
    clearProtocol,
    saveToDatabase,
    isAllChecked,
    forceResetProtocol // NOUVELLE FONCTION EXPORTÉE
  };
}