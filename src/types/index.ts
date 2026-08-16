//index.ts
// ======== TYPES EXISTANTS (inchangés) ========

export type UserRole = 
  | 'ADMIN'
  | 'DIRECTOR'
  | 'TECH_MANAGER'
  | 'MANAGER'
  | 'CHIEF_TECH_CMS'
  | 'CHIEF_TECH_VMS'
  | 'TECH_CMS'
  | 'TECH_VMS'
  | 'CHIEF_INSTALLER'
  | 'INSTALLER'
  | 'WAREHOUSE'
  | 'CLIENT';

export type InterventionType = 'REPAIR' | 'MAINTENANCE' | 'INSTALLATION' | 'COMMISSIONING';
export type InterventionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Client {
  _id: string;
  numeroClient: string;
  nom: string;
  nomFerme: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}

export interface Intervention {
  _id: string;
  numeroIntervention: string;
  type: InterventionType;
  status: InterventionStatus;
  machineIds: string[];
  technicienId: string;
  clientId: string;
  dateDebut?: string;
  dateFin?: string;
  duree?: number;
  gpsLat?: number;
  gpsLng?: number;
  diagnostic?: string;
  actionsRealisees?: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}


// ======== NOUVEAUX TYPES POUR LA FICHE MACHINE ========

// Représente un champ dynamique (ex: "Référence": "REF-1234")
export interface DynamicField {
  key: string;   // Le nom du champ (ex: "Référence", "Détail technique")
  value: string; // La valeur du champ
}

// Représente un composant de base (ex: "Résistance", "Thermostat")
export interface Composant {
  _id: string; // Un ID unique pour ce composant
  nom: string;
  // Contient les détails, références, etc. ajoutés par l'utilisateur
  champsDynamiques: DynamicField[]; 
  // On pourrait ajouter un historique ici si besoin
}

// Représente un sous-ensemble (ex: "Chauffe-eau", "Système de ventilation")
export interface SousEnsemble {
  _id: string; // Un ID unique pour ce sous-ensemble
  nom: string;
  composants: Composant[];
}

// Représente une relation avec une autre machine
export interface MachineRelation {
  relatedMachineId: string; // L'ID de la machine liée
  type: 'MASTER' | 'SLAVE' | 'PARENT' | 'CHILD'; // Le type de relation
  description?: string; // Optionnel : pour décrire la nature de la liaison
}


// ======== TYPE MACHINE MODIFIÉ ========

export interface Machine {
  _id: string;
  clientId: string;
  nom: string; // ex: "V300"
  numeroSerie: string;
  
  // --- NOUVEAU : La structure hiérarchique ---
  // Remplace les anciens champs plats par une arborescence
  sousEnsembles: SousEnsemble[];

  // --- NOUVEAU : Relations flexibles ---
  // Un tableau pour gérer plusieurs relations (Maître/Esclave, etc.)
  relations: MachineRelation[]; 
  
  // --- Champs généraux de la machine (qui restent) ---
  gpsLat?: number;
  gpsLng?: number;
  dateInstallation?: string;
  dateDernierEntretien?: string;
  compteur?: number;
  
  // Champs dynamiques au niveau de la machine elle-même
  champsDynamiques: DynamicField[];

  creator: string;
  createdAt: string;
  updatedAt: string;
}