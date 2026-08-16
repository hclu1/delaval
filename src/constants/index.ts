export const ROLES = {
  ADMIN: { label: 'Administrateur', value: 'ADMIN' },
  DIRECTOR: { label: 'Directeur', value: 'DIRECTOR' },
  TECH_MANAGER: { label: 'Responsable Technique', value: 'TECH_MANAGER' },
  MANAGER: { label: 'Responsable / Supérieur', value: 'MANAGER' },
  CHIEF_TECH_CMS: { label: 'Chef Technicien CMS', value: 'CHIEF_TECH_CMS' },
  CHIEF_TECH_VMS: { label: 'Chef Technicien VMS', value: 'CHIEF_TECH_VMS' },
  TECH_CMS: { label: 'Technicien CMS', value: 'TECH_CMS' },
  TECH_VMS: { label: 'Technicien VMS', value: 'TECH_VMS' },
  CHIEF_INSTALLER: { label: 'Chef Monteur', value: 'CHIEF_INSTALLER' },
  INSTALLER: { label: 'Monteur', value: 'INSTALLER' },
  WAREHOUSE: { label: 'Magasinier', value: 'WAREHOUSE' },
  CLIENT: { label: 'Client', value: 'CLIENT' },
} as const;

export const INTERVENTION_TYPES = {
  REPAIR: { label: 'Dépannage', value: 'REPAIR', icon: '🔧' },
  MAINTENANCE: { label: 'Entretien', value: 'MAINTENANCE', icon: '⚙️' },
  INSTALLATION: { label: 'Montage', value: 'INSTALLATION', icon: '🔨' },
  COMMISSIONING: { label: 'Mise en service', value: 'COMMISSIONING', icon: '✅' },
} as const;

export const MACHINE_RELATIONS = {
  MASTER: { label: 'Maître', value: 'MASTER' },
  SLAVE: { label: 'Esclave', value: 'SLAVE' },
  PARENT: { label: 'Parent', value: 'PARENT' },
  CHILD: { label: 'Enfant', value: 'CHILD' },
} as const;
