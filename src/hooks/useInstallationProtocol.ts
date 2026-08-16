// useInstallationProtocol.ts
import { useState, useEffect } from 'react';

export interface InstallationSection {
  id: string;
  title: string;
  checklistItems: ChecklistItem[];
  textFields: TextField[];
  photos: string[];
  timeSpent: number; // minutes
  customFields: CustomField[];
  isOpen: boolean;
  startTime?: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface TextField {
  id: string;
  label: string;
  value: string;
  multiline?: boolean;
}

export interface CustomField {
  id: string;
  type: 'text' | 'checkbox' | 'number' | 'date' | 'photo';
  label: string;
  value: any;
}

export interface InstallationData {
  interventionId: string;
  numeroIntervention: string;
  clientId: string;
  machineId: string;
  modeleRobot: string;
  typeInstallation: 'neuve' | 'remplacement';
  techniciens: string[];
  sections: InstallationSection[];
  tempsTotal: number;
  statut: 'brouillon' | 'en_cours' | 'termine';
  gpsLogs: Array<{
    timestamp: number;
    lat: number;
    lng: number;
    event: 'start' | 'pause' | 'resume' | 'end';
  }>;
}

const INITIAL_SECTIONS: InstallationSection[] = [
  {
    id: 'section_1',
    title: '1. Préparation du Site',
    checklistItems: [
      { id: 'check_1_1', label: 'Vérification électrique (puissance, tableau, disjoncteur)', checked: false },
      { id: 'check_1_2', label: 'Vérification plomberie (eau chaude, eau froide)', checked: false },
      { id: 'check_1_3', label: 'Emplacement stalle préparé et nettoyé', checked: false },
      { id: 'check_1_4', label: 'Accès dégagé pour livraison équipements', checked: false }
    ],
    textFields: [
      { id: 'text_1_1', label: 'Commentaires préparation site', value: '', multiline: true }
    ],
    photos: [],
    timeSpent: 0,
    customFields: [],
    isOpen: false
  },
  {
    id: 'section_2',
    title: '2. Montage Mécanique',
    checklistItems: [
      { id: 'check_2_1', label: 'Assemblage structure stalle', checked: false },
      { id: 'check_2_2', label: 'Installation bras robotisé', checked: false },
      { id: 'check_2_3', label: 'Montage système traite (gobelets, tuyauterie)', checked: false },
      { id: 'check_2_4', label: 'Installation éclairage stalle', checked: false },
      { id: 'check_2_5', label: 'Fixation panneaux et protections', checked: false }
    ],
    textFields: [
      { id: 'text_2_1', label: 'Numéros de série équipements', value: '', multiline: true },
      { id: 'text_2_2', label: 'Commentaires montage', value: '', multiline: true }
    ],
    photos: [],
    timeSpent: 0,
    customFields: [],
    isOpen: false
  },
  {
    id: 'section_3',
    title: '3. Hydraulique & Pneumatique',
    checklistItems: [
      { id: 'check_3_1', label: 'Raccordement arrivée eau (chaude + froide)', checked: false },
      { id: 'check_3_2', label: 'Raccordement évacuation eaux usées', checked: false },
      { id: 'check_3_3', label: 'Installation système vide', checked: false },
      { id: 'check_3_4', label: 'Raccordement air comprimé', checked: false },
      { id: 'check_3_5', label: 'Test étanchéité tous circuits', checked: false },
      { id: 'check_3_6', label: 'Vérification pressions (vide + air)', checked: false }
    ],
    textFields: [
      { id: 'text_3_1', label: 'Relevés de pression', value: '', multiline: true },
      { id: 'text_3_2', label: 'Commentaires hydraulique/pneumatique', value: '', multiline: true }
    ],
    photos: [],
    timeSpent: 0,
    customFields: [],
    isOpen: false
  },
  {
    id: 'section_4',
    title: '4. Électrique',
    checklistItems: [
      { id: 'check_4_1', label: 'Raccordement alimentation principale', checked: false },
      { id: 'check_4_2', label: 'Câblage moteurs et actionneurs', checked: false },
      { id: 'check_4_3', label: 'Installation capteurs et détecteurs', checked: false },
      { id: 'check_4_4', label: 'Raccordement boîtier de commande', checked: false },
      { id: 'check_4_5', label: 'Vérification mise à la terre', checked: false },
      { id: 'check_4_6', label: 'Test continuité circuits', checked: false }
    ],
    textFields: [
      { id: 'text_4_1', label: 'Relevés électriques (tensions, intensités)', value: '', multiline: true },
      { id: 'text_4_2', label: 'Commentaires installation électrique', value: '', multiline: true }
    ],
    photos: [],
    timeSpent: 0,
    customFields: [],
    isOpen: false
  },
  {
    id: 'section_5',
    title: '5. Mise en Route du Robot',
    checklistItems: [
      { id: 'check_5_1', label: 'Premier démarrage système', checked: false },
      { id: 'check_5_2', label: 'Vérification mouvements bras robotisé', checked: false },
      { id: 'check_5_3', label: 'Test cycle de traite à vide', checked: false },
      { id: 'check_5_4', label: 'Vérification système de nettoyage', checked: false },
      { id: 'check_5_5', label: 'Test tous capteurs et détecteurs', checked: false },
      { id: 'check_5_6', label: 'Calibration système vision', checked: false }
    ],
    textFields: [
      { id: 'text_5_1', label: 'Observations tests fonctionnels', value: '', multiline: true },
      { id: 'text_5_2', label: 'Ajustements effectués', value: '', multiline: true }
    ],
    photos: [],
    timeSpent: 0,
    customFields: [],
    isOpen: false
  }
];

export function useInstallationProtocol(interventionId?: string) {
  const [installationData, setInstallationData] = useState<InstallationData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load existing installation or initialize new one
  useEffect(() => {
    const loadInstallation = () => {
      const storageKey = `installation_${interventionId}`;
      const saved = localStorage.getItem(storageKey);
      
     if (saved) {
  try {
    const parsed = JSON.parse(saved);
    // Réinitialise les sections ouvertes sur cet appareil (startTime invalide sur un autre device)
    parsed.sections = parsed.sections.map((s: InstallationSection) =>
      s.isOpen ? { ...s, isOpen: false, startTime: undefined } : s
    );
    setInstallationData(parsed);
  } catch (error) {          console.error('Error loading installation:', error);
          initializeNewInstallation();
        }
      } else {
        initializeNewInstallation();
      }
    };

    if (interventionId) {
      loadInstallation();
    }
  }, [interventionId]);

  const initializeNewInstallation = () => {
    setInstallationData({
      interventionId: interventionId || '',
      numeroIntervention: '',
      clientId: '',
      machineId: '',
      modeleRobot: '',
      typeInstallation: 'neuve',
      techniciens: [],
      sections: JSON.parse(JSON.stringify(INITIAL_SECTIONS)),
      tempsTotal: 0,
      statut: 'brouillon',
      gpsLogs: []
    });
  };

  const saveToLocalStorage = (data: InstallationData) => {
    if (data.interventionId) {
      const storageKey = `installation_${data.interventionId}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  };

  const updateInstallation = (updates: Partial<InstallationData>) => {
    setInstallationData(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const toggleSection = (sectionId: string) => {
    setInstallationData(prev => {
      if (!prev) return null;
      
      const now = Date.now();
      const sections = prev.sections.map(section => {
        if (section.id === sectionId) {
          // Toggle section
          const isNowOpen = !section.isOpen;
          
          // If opening, set start time
          if (isNowOpen) {
            return { ...section, isOpen: true, startTime: now };
          }
          
          // If closing, calculate time spent
          if (section.startTime) {
            const timeSpent = Math.floor((now - section.startTime) / 60000); // minutes
            return { ...section, isOpen: false, timeSpent: section.timeSpent + timeSpent, startTime: undefined };
          }
          
          return { ...section, isOpen: false };
        }
        
        // Close other sections and calculate their time if they were open
        if (section.isOpen && section.startTime) {
          const timeSpent = Math.floor((now - section.startTime) / 60000);
          return { ...section, isOpen: false, timeSpent: section.timeSpent + timeSpent, startTime: undefined };
        }
        
        return section;
      });
      
      const updated = { ...prev, sections };
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const updateChecklistItem = (sectionId: string, itemId: string, checked: boolean) => {
    setInstallationData(prev => {
      if (!prev) return null;
      
      const sections = prev.sections.map(section => {
        if (section.id === sectionId) {
          const checklistItems = section.checklistItems.map(item =>
            item.id === itemId ? { ...item, checked } : item
          );
          return { ...section, checklistItems };
        }
        return section;
      });
      
      const updated = { ...prev, sections };
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const updateTextField = (sectionId: string, fieldId: string, value: string) => {
    setInstallationData(prev => {
      if (!prev) return null;
      
      const sections = prev.sections.map(section => {
        if (section.id === sectionId) {
          const textFields = section.textFields.map(field =>
            field.id === fieldId ? { ...field, value } : field
          );
          return { ...section, textFields };
        }
        return section;
      });
      
      const updated = { ...prev, sections };
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const addCustomField = (sectionId: string, customField: CustomField) => {
    setInstallationData(prev => {
      if (!prev) return null;
      
      const sections = prev.sections.map(section => {
        if (section.id === sectionId) {
          return { ...section, customFields: [...section.customFields, customField] };
        }
        return section;
      });
      
      const updated = { ...prev, sections };
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const updateCustomField = (sectionId: string, fieldId: string, value: any) => {
    setInstallationData(prev => {
      if (!prev) return null;
      
      const sections = prev.sections.map(section => {
        if (section.id === sectionId) {
          const customFields = section.customFields.map(field =>
            field.id === fieldId ? { ...field, value } : field
          );
          return { ...section, customFields };
        }
        return section;
      });
      
      const updated = { ...prev, sections };
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const addPhoto = (sectionId: string, photoUrl: string) => {
    setInstallationData(prev => {
      if (!prev) return null;
      
      const sections = prev.sections.map(section => {
        if (section.id === sectionId) {
          return { ...section, photos: [...section.photos, photoUrl] };
        }
        return section;
      });
      
      const updated = { ...prev, sections };
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const calculateTotalTime = () => {
    if (!installationData) return 0;
    
    const now = Date.now();
    let total = 0;
    
    installationData.sections.forEach(section => {
      total += section.timeSpent;
      
      // Add current section time if it's open
      if (section.isOpen && section.startTime) {
        total += Math.floor((now - section.startTime) / 60000);
      }
    });
    
    return total;
  };

  const getProgressPercentage = () => {
    if (!installationData) return 0;
    
    let totalItems = 0;
    let completedItems = 0;
    
    installationData.sections.forEach(section => {
      section.checklistItems.forEach(item => {
        totalItems++;
        if (item.checked) completedItems++;
      });
    });
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const resetInstallation = () => {
    if (interventionId) {
      const storageKey = `installation_${interventionId}`;
      localStorage.removeItem(storageKey);
    }
    initializeNewInstallation();
  };

  return {
    installationData,
    loading,
    updateInstallation,
    toggleSection,
    updateChecklistItem,
    updateTextField,
    addCustomField,
    updateCustomField,
    addPhoto,
    calculateTotalTime,
    getProgressPercentage,
    resetInstallation,
    saveToLocalStorage
  };
}
