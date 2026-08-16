//InterventionsScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { SearchBar } from '../../components/common/SearchBar';
import { Button } from '../../components/common/Button';
import { Plus, Clock, AlertCircle, Calendar } from 'lucide-react';
import { useInterventions } from '../../hooks/useInterventions';
import { useClients } from '../../hooks/useClients';
import { useMachines } from '../../hooks/useMachines';
import { useVisibilityRefresh } from '../../hooks/useVisibilityRefresh';
import { useAuth } from '../../hooks/useAuth'; // ✅ AJOUT

interface InterventionsScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}

// 🎨 COULEURS CENTRALISÉES PAR TYPE D'INTERVENTION
const INTERVENTION_TYPE_COLORS: Record<string, {
  bg: string;
  border: string;
  text: string;
}> = {
  REPAIR: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
  },
  MAINTENANCE: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
  },
  INSTALLATION: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
  },
  COMMISSIONING: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
  },
};

const getInterventionTypeInfo = (type: string) => {
  const typeInfo: Record<string, { emoji: string; label: string }> = {
    'MAINTENANCE': { emoji: '⚙️', label: 'Entretien' },
    'Entretien': { emoji: '⚙️', label: 'Entretien' },
    'REPAIR': { emoji: '🔧', label: 'Dépannage' },
    'INSTALLATION': { emoji: '📦', label: 'Installation' },
    'COMMISSIONING': { emoji: '🚀', label: 'Mise en service' }
  };
  return typeInfo[type] || { emoji: '⚙️', label: type };
};

const getTechnicienName = (technicienId: string) => {
  const techniciens: Record<string, string> = {
    'TECH001': 'Jean Dupont',
    'TECH002': 'Marie Martin',
    'TECH003': 'Pierre Durand',
    'TECH004': 'Sophie Composante',
  };
  return techniciens[technicienId] || technicienId;
};

export function InterventionsScreen({ onNavigate }: InterventionsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'>('ALL');
  const { interventions, loading, fetchInterventions } = useInterventions();
  const { clients, fetchClients } = useClients();
  const { machines, fetchMachines } = useMachines();
  
  // ✅ AJOUT : Hook pour les permissions
  const { userData, hasPermission } = useAuth();

  useEffect(() => {
    fetchInterventions({ limit: 100 });
    fetchClients({ limit: 100 });
    fetchMachines({ limit: 100 });
  }, []);

  // Rafraîchissement automatique au retour sur l'app (smartphone)
  useVisibilityRefresh(() => { fetchInterventions({ limit: 100 }); fetchClients({ limit: 100 }); fetchMachines({ limit: 100 }); });

  // ═══════════════════════════════════════════════════════════════
  // FILTRAGE DES INTERVENTIONS PAR RÔLE
  // ═══════════════════════════════════════════════════════════════
  const filterInterventionsByRole = (interventionsList: any[]) => {
    if (!userData) return interventionsList;

    console.log('🔐 Filtrage interventions pour:', userData.prenom, userData.nom);
    // ✅ CORRECTION : On utilise userData.permissions et non 'permissions' seul
    console.log('🔐 Permissions:', userData?.permissions);
    console.log('🔐 Total interventions:', interventionsList.length);

    // ✅ Filtrer selon les permissions par type d'intervention
    const filtered = interventionsList.filter(intervention => {
      // ADMIN : voit tout
      if (userData?.role === 'ADMIN') return true;

      const type = intervention.type;
      
      // MAINTENANCE / Entretien
      if (type === 'MAINTENANCE' || type === 'Entretien') {
        const canView = hasPermission('view_interventions_maintenance');
        console.log(`  🔍 ${type} → view_interventions_maintenance:`, canView);
        return canView;
      }
      
      // REPAIR / Dépannage
      if (type === 'REPAIR') {
        const canView = hasPermission('view_interventions_repair');
        console.log(`  🔍 ${type} → view_interventions_repair:`, canView);
        return canView;
      }
      
      // INSTALLATION / Montage
      if (type === 'INSTALLATION') {
        const canView = hasPermission('view_interventions_installation');
        console.log(`  🔍 ${type} → view_interventions_installation:`, canView);
        return canView;
      }
      
      // COMMISSIONING / Mise en service
      if (type === 'COMMISSIONING') {
        const canView = hasPermission('view_interventions_commissioning');
        console.log(`  🔍 ${type} → view_interventions_commissioning:`, canView);
        return canView;
      }
      
      // Type inconnu ou vide : par sécurité on l'affiche pour ne pas le perdre
      console.warn(`  ⚠️ Type inconnu ou manquant:`, type);
      return true;
    });

    console.log('🔐 Interventions filtrées:', filtered.length);
    const accessibleTypes = [...new Set(filtered.map(i => i.type))];
    console.log('🔐 Types accessibles:', accessibleTypes);

    return filtered;
  };

// ✅ MODIFICATION : Application des filtres
const filteredInterventions = filterInterventionsByRole(interventions).filter((intervention) => {
  const matchesSearch = !searchQuery || 
    (intervention.numeroIntervention?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (intervention.diagnostic?.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const matchesFilter = filter === 'ALL' || intervention.statut === filter;
  
  return matchesSearch && matchesFilter;
});

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PLANIFIEE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'EN_COURS': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'TERMINEE': return 'bg-green-100 text-green-800 border-green-300';
    case 'ANNULEE': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PLANIFIEE: 'Planifiée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée'
  };
  return labels[status] || status;
};

// ✅ AJOUT : Vérifier si l'utilisateur peut créer AU MOINS UN type d'intervention
const canCreateIntervention = 
  hasPermission('create_interventions_maintenance') ||
  hasPermission('create_interventions_repair') ||
  hasPermission('create_interventions_installation') ||
  hasPermission('create_interventions_commissioning');

return (
  <div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Interventions</h1>
        <p className="text-gray-600 mt-1">
          Historique et suivi des interventions
          {/* ✅ AJOUT : Info pour l'utilisateur */}
          {userData && (
            <span className="block text-sm text-blue-600 mt-1">
              {userData.role === 'MONTEUR' && '📦 Vous voyez les interventions d\'installation'}
              {userData.role === 'TECHNICIEN_CMS' && '🔧 Vous voyez vos interventions de maintenance'}
              {userData.role === 'MAGASINIER' && '📦 Vous voyez les interventions terminées'}
            </span>
          )}
        </p>
      </div>
        
        {/* ✅ MODIFICATION : Bouton conditionnel */}
        {canCreateIntervention && (
          <Button 
            className="flex items-center gap-2"
            onClick={() => onNavigate('intervention-form')}
          >
            <Plus size={20} />
            Nouvelle intervention
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher une intervention..."
          className="flex-1"
        />
        <div className="flex gap-2 flex-wrap">
          <Button variant={filter === 'ALL' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('ALL')}>
            Toutes
          </Button>
          <Button variant={filter === 'PLANIFIEE' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('PLANIFIEE')}>
            Planifiées
          </Button>
          <Button variant={filter === 'EN_COURS' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('EN_COURS')}>
            En cours
          </Button>
          <Button variant={filter === 'TERMINEE' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('TERMINEE')}>
            Terminées
          </Button>
          <Button variant={filter === 'ANNULEE' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('ANNULEE')}>
            Annulées
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="text-center py-12">
          <p className="text-gray-500">Chargement des interventions...</p>
        </Card>
      ) : filteredInterventions.length === 0 ? (
        <Card className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            {searchQuery ? 'Aucune intervention trouvée pour cette recherche' : 'Aucune intervention accessible'}
          </p>
          {/* ✅ AJOUT : Message informatif selon le rôle */}
          {userData?.role === 'MONTEUR' && (
            <p className="text-sm text-gray-400 mt-2">
              En tant que Monteur, vous ne voyez que les interventions de type Installation
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInterventions.map((intervention) => {
            const client = clients.find(c => c._id === intervention.clientId);
            const interventionMachines = machines.filter(m => intervention.machineIds?.includes(m._id));
            const typeInfo = getInterventionTypeInfo(intervention.type);
            const techName = intervention.technicianName || getTechnicienName(intervention.technicienId || 'TECH001');
            
            const statusRaw = (intervention.statut || intervention.status || 'PLANIFIEE').toUpperCase();
            const isFinished = statusRaw === 'TERMINEE';
            const isInProgress = statusRaw === 'EN_COURS';

            const typeColors = INTERVENTION_TYPE_COLORS[intervention.type] || INTERVENTION_TYPE_COLORS['REPAIR'];

            const hasProtocol = intervention.protocolData;
            const protocolStatus = hasProtocol ? intervention.protocolData?.status : null;
            const protocolProgress = hasProtocol ? intervention.protocolData?.progression : null;

            return (
              <Card 
                key={intervention._id}
                className={`hover:shadow-md transition-all cursor-pointer ${isFinished ? 'border-gray-300 bg-gray-50' : 'border-blue-200 bg-white'}`}
                onClick={() => {
                  console.log('🖱️ [INTERVENTIONS] Click sur intervention');
                  console.log('🖱️ [INTERVENTIONS] Type:', intervention.type);
                  console.log('🖱️ [INTERVENTIONS] ID:', intervention._id);
                  console.log('🖱️ [INTERVENTIONS] Statut:', intervention.statut);
                  
                  const isFinished = intervention.statut === 'TERMINEE';
                  
                  switch (intervention.type) {
                    case 'REPAIR':
                    case 'INSTALLATION':
                      console.log('✅ Navigation vers: intervention-form');
                      onNavigate('intervention-form', { 
                        interventionId: intervention._id,
                        clientId: intervention.clientId,
                        machineId: intervention.machineIds?.[0],
                        readOnly: isFinished
                      });
                      break;
                    
                    case 'MAINTENANCE':
                    case 'Entretien': {
                      console.log('✅ Navigation vers: multi-machine-section-selection (MAINTENANCE)');
                      console.log('📦 intervention.kits:', intervention.kits);
                      console.log('📦 intervention.selectedSections:', intervention.selectedSections);

                      const machineKitSelections = (intervention.kits || []).map((kit: any) => ({
                        machineId: kit.machineId,
                        kitId: kit.kitId
                      }));

                      const savedSectionsState = (intervention.selectedSections || []).map((s: any) => ({
                        machineId: s.machineId,
                        sectionName: s.sectionName,
                        tasks: s.tasks || []
                      }));

                      console.log('📦 machineKitSelections reconstruit:', machineKitSelections);
                      console.log('📦 savedSectionsState reconstruit:', savedSectionsState);

                      onNavigate('multi-machine-section-selection', { 
                        clientId: intervention.clientId,
                        machineKitSelections: machineKitSelections,
                        resumeInterventionId: intervention._id,
                        savedSectionsState: savedSectionsState
                      });
                      break;
                    }
                    
                    case 'COMMISSIONING':
                      console.log('✅ Navigation vers: commissioning-protocol');
                      onNavigate('commissioning-protocol', { 
                        interventionId: intervention._id,
                        clientId: intervention.clientId,
                        machineIds: intervention.machineIds || [],
                        readOnly: isFinished
                      });
                      break;

                    default:
                      console.log('⚠️ Type inconnu, navigation par défaut');
                      onNavigate('intervention-form', { 
                        interventionId: intervention._id,
                        clientId: intervention.clientId,
                        readOnly: isFinished
                      });
                      break;
                  }
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${typeColors.bg} ${typeColors.border} border`}>
                      <span className="text-lg">{typeInfo.emoji}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-lg">
                          {intervention.numeroIntervention || 
                           intervention.numero_intervention || 
                           (intervention.protocolData?.session?.numeroIntervention) || 
                           'N° En attente'}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeColors.bg} ${typeColors.border} ${typeColors.text} border`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        👤 {techName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {client?.nom || 'Client inconnu'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {isFinished && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                        ✅ Terminée
                      </span>
                    )}
                    
                    {isInProgress && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        🔵 En cours
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {client?.nomFerme && (
                    <div className="text-sm text-gray-600">
                      {client.nomFerme}
                    </div>
                  )}
                  
                  {interventionMachines.length > 0 && (
                    <div className="text-sm text-gray-600">
                      {interventionMachines.map(m => m.nom).join(', ')}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} />
                    <span>
                      Début: {new Date(intervention.createdAt || intervention.dateDebut).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  {hasProtocol && (
                    <div className="text-xs bg-purple-50 text-purple-800 p-2 rounded border border-purple-200 mt-2">
                      🚀 Protocole : {protocolStatus === 'completed' ? '✅ Terminé' : `📝 En cours (${protocolProgress || 0}%)`}
                    </div>
                  )}

                  {intervention.duree && (
                    <div className="text-sm text-gray-500">
                      (Durée: {intervention.duree} min)
                    </div>
                  )}
                  
                  {intervention.diagnostic && (
                    <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded truncate">
                      {intervention.diagnostic}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}