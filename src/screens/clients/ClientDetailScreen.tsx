// ClientDetailScreen.tsx - AVEC RÉACTIVATION
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {ArrowLeft, Plus, MapPin, Phone, Mail, Building, Calendar, Edit, Wrench, History, Navigation, Target, Cpu, Zap, Layers, FileText, ChevronDown, MessageSquare, GripVertical, PlayCircle, RotateCcw, CheckCircle} from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useMachines } from '../../hooks/useMachines';
import { useInterventions } from '../../hooks/useInterventions';
import { useClientMessages } from '../../hooks/useClientMessages';
import { useMaintenanceMonitoring } from '../../hooks/useMaintenanceMonitoring';
import { ClientMessageModal } from '../../components/domain/ClientMessageModal';
import { MachineCard } from '../../components/domain/MachineCard';
import { InterventionHistoryCard } from '../../components/domain/InterventionHistoryCard';
import { api } from '../../lib/api';
// Imports Drag & Drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Chaque type d'intervention a sa propre couleur pour qu'on puisse
// les distinguer rapidement dans les listes et les cartes :
// - Dépannage (REPAIR)        = bleu clair
// - Entretien (MAINTENANCE)   = vert clair
// - Montage (INSTALLATION)    = jaune clair
// - Mise en service (COMMISSIONING) = orange clair
// Ces couleurs sont utilisées dans InterventionFormScreen, InterventionsScreen et ici.
export const INTERVENTION_TYPE_COLORS: Record<string, {
  bg: string;       // couleur de fond du badge / icône
  border: string;   // couleur de la bordure
  text: string;     // couleur du texte du label
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

// Helper Fonction pour obtenir le type d'intervention
const getInterventionTypeInfo = (type: string) => {
  const typeInfo: Record<string, { emoji: string; label: string }> = {
    'MAINTENANCE': { emoji: '⚙️', label: 'Entretien' },
    'REPAIR': { emoji: '🔧', label: 'Dépannage' },
    'INSTALLATION': { emoji: '🔨', label: 'Installation' },
    'COMMISSIONING': { emoji: '🚀', label: 'Mise en service' }
  };
  return typeInfo[type] || { emoji: '⚙️', label: type };
};

// Fonction pour obtenir le nom du technicien depuis son ID
const getTechnicienName = (technicienId: string) => {
  const techniciens: Record<string, string> = {
    'TECH001': 'Jean Dupont',
    'TECH002': 'Marie Martin',
    'TECH003': 'Pierre Durand',
    'TECH004': 'Composante Sophie',
  };
  return techniciens[technicienId] || technicienId;
};

// Fonction Helper pour le type de configuration
const getConfigStyle = (type: string) => {
  switch(type) {
    case 'pump': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Pompe à vide', icon: <Cpu size={20} /> };
    case 'v300': return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'V300', icon: <Zap size={20} /> };
    case 'other': return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Personnalisé', icon: <Layers size={20} /> };
    default: return null;
  }
};

// Composant wrapper pour chaque machine draggable
function SortableMachineCard({ machine, client, onNavigate, onSelectMachine }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: machine._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Bouton glisser */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute left-2 bottom-2 z-10 bg-white rounded-lg p-2 shadow-md cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={20} className="text-gray-400" />
      </div>
      
      {/* Carte Machine */}
      <MachineCard
        machine={machine}
        onSelect={() => onSelectMachine(machine._id)}
        onEdit={() => {
          onNavigate?.('machine-form', { 
            machineId: machine._id, 
            clientId: client._id 
          });
        }}
        onIntervention={() => onNavigate?.('intervention-form', { clientId: client._id, machineId: machine._id })}
        onHistory={() => onNavigate?.('machine-detail', { clientId: client._id, machineId: machine._id })}
      />
    </div>
  );
}

export function ClientDetailScreen({ onNavigate, clientId }: any) {
  const { clients, loading: loadingClient, fetchClients } = useClients();
  const { machines, loading: loadingMachines, fetchMachines, updateMachine } = useMachines();
  const { interventions, loading: loadingInterventions, fetchInterventions } = useInterventions();
  const { messages, fetchMessages, createMessage, markAsRead, deleteMessage } = useClientMessages();
  const { getMachineStatus } = useMaintenanceMonitoring();

  const [client, setClient] = useState<any>(null);
  const [clientMachines, setClientMachines] = useState<any[]>([]);
  const [clientInterventions, setClientInterventions] = useState<any[]>([]);
  const [clientMessages, setClientMessages] = useState<any[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  
  // États pour la réactivation
  const [showReactivationModal, setShowReactivationModal] = useState(false);
  const [reactivationInterventionId, setReactivationInterventionId] = useState<string | null>(null);
  const [reactivationCode, setReactivationCode] = useState('');
  const [isReactivating, setIsReactivating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    if (clientId) {
      fetchClients({ filter: { _id: clientId } });
      fetchMachines({ filter: { clientId } });
      fetchInterventions({ filter: { clientId } });
      fetchMessages({ filter: { clientId } });
    }
  }, [clientId]);

  useEffect(() => {
    if (clients.length > 0) {
      setClient(clients[0]);
    }
  }, [clients]);

  useEffect(() => {
    const sortedMachines = [...machines].sort((a, b) => {
      const ordreA = a.ordre ?? 999999;
      const ordreB = b.ordre ?? 999999;
      return ordreA - ordreB;
    });
    setClientMachines(sortedMachines);
  }, [machines]);

  useEffect(() => {
    // ✅ CORRECTION : Dédupliquer les interventions par _id
    const uniqueInterventions = interventions.reduce((acc: any[], intervention: any) => {
      if (!acc.find((i: any) => i._id === intervention._id)) {
        acc.push(intervention);
      }
      return acc;
    }, []);
    
    const sortedInterventions = uniqueInterventions.sort((a, b) => 
      new Date(b.createdAt || b.dateDebut).getTime() - new Date(a.createdAt || a.dateDebut).getTime()
    );
    setClientInterventions(sortedInterventions);
  }, [interventions]);

  useEffect(() => {
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime()
    );
    setClientMessages(sortedMessages);
    
    const unreadCount = messages.filter(m => !m.estLu).length;
    setUnreadMessagesCount(unreadCount);
  }, [messages]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = clientMachines.findIndex(m => m._id === active.id);
    const newIndex = clientMachines.findIndex(m => m._id === over.id);

    const newOrder = arrayMove(clientMachines, oldIndex, newIndex);
    setClientMachines(newOrder);

    try {
      const updatePromises = newOrder.map((machine, index) => 
        updateMachine(machine._id, { ordre: index })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Erreur:', error);
      fetchMachines({ filter: { clientId } });
    }
  };

  // ============================================================
  // RÉACTIVATION D'INTERVENTION
  // ============================================================

  const handleOpenReactivationModal = (interventionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher le clic sur la carte
    setReactivationInterventionId(interventionId);
    setReactivationCode('');
    setShowReactivationModal(true);
  };

  const handleCloseReactivationModal = () => {
    setShowReactivationModal(false);
    setReactivationInterventionId(null);
    setReactivationCode('');
  };

  const handleCloseFromHistory = async (interventionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Clôturer définitivement cette intervention ?')) return;
    
    try {
      await api.entities.interventions.update(interventionId, {
        statut: 'TERMINEE',
        dateFin: new Date().toISOString()
      });
      
      // ✅ Mettre à jour l'état local immédiatement
      setClientInterventions(prev => 
        prev.map(i => 
          i._id === interventionId 
            ? { ...i, statut: 'TERMINEE', dateFin: new Date().toISOString() }
            : i
        )
      );
      
      // Recharger pour confirmer
      await fetchInterventions({ filter: { clientId } });
      
      alert('✅ Intervention clôturée avec succès');
    } catch (error) {
      console.error('❌ Erreur clôture:', error);
      alert(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const handleReactivateIntervention = async () => {
    // Vérifier le code PIN
    if (reactivationCode !== '3131') {
      alert('❌ Code incorrect');
      return;
    }

    if (!reactivationInterventionId) return;

    setIsReactivating(true);

    try {
      // Mettre à jour l'intervention
      await api.entities.interventions.update(reactivationInterventionId, {
        statut: 'EN_COURS',
        dateFin: null
      });

      // Si c'est une installation, mettre à jour le montage aussi
      const intervention = clientInterventions.find(i => i._id === reactivationInterventionId);
      if (intervention?.type === 'INSTALLATION' && intervention?.montageId) {
        await api.entities.montages.update(intervention.montageId, {
          statut: 'EN_COURS',
          dateCloture: null
        });
      }

      // ✅ CORRECTION : Mettre à jour l'état local immédiatement
      setClientInterventions(prev => 
        prev.map(i => 
          i._id === reactivationInterventionId 
            ? { ...i, statut: 'EN_COURS', dateFin: null }
            : i
        )
      );


      // Recharger les interventions
      await fetchInterventions({ filter: { clientId } });

      alert('✅ Intervention réactivée avec succès');
      handleCloseReactivationModal();
    } catch (error) {
      console.error('❌ Erreur réactivation:', error);
      alert(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsReactivating(false);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!client) return;
    
    await createMessage({
      clientId: client._id,
      clientName: client.nom,
      message: messageText
    });
    fetchMessages({ filter: { clientId: client._id } });
  };

  /**
   * Fonction appelée quand on clique sur une machine
   * Vérifie si la machine fait partie d'un montage en cours
   */
  const handleSelectMachine = async (machineId: string) => {
    try {
      // 1. Chercher les interventions de type INSTALLATION pour ce client
   const installationInterventions = clientInterventions.filter(
  (i: any) => (i.type === 'INSTALLATION' || i.type === 'COMMISSIONING') && i.statut !== 'TERMINEE'
);

      // 2. Pour chaque intervention, vérifier si elle a un montage contenant cette machine
      for (const intervention of installationInterventions) {
       // Cas COMMISSIONING : les machines liées sont dans machineIds directement
      if (intervention.type === 'COMMISSIONING') {
        if ((intervention.machineIds || []).includes(machineId)) {
          onNavigate('commissioning-protocol', {
            interventionId: intervention._id,
            clientId: intervention.clientId,
            machineIds: intervention.machineIds || [],
            readOnly: false
          });
          return;
        }
        continue;
      }

      // Pas de montage encore créé mais machine dans machineIds → ouvrir directement
      if (!intervention.montageId) {
        if ((intervention.machineIds || []).includes(machineId)) {
          onNavigate('installation-protocol', {
            interventionId: intervention._id,
            clientId: intervention.clientId,
            machineId: machineId
          });
          return;
        }
        continue;
      }

      if (intervention.montageId) {
        try {
          const montage = await api.entities.montages.get(intervention.montageId);

            // Les machines sont stockées en base64 dans photos[0]
            let montagesMachines: any[] = [];
            // Nouveau format : machines dans sections.machines
            if (montage?.sections?.machines?.length > 0) {
              montagesMachines = montage.sections.machines;
            } else if (montage?.photos?.[0]) {
              // Ancien format : machines encodées en base64 dans photos[0]
              try {
                const dataJSON = decodeURIComponent(escape(atob(montage.photos[0])));
                const recoveredData = JSON.parse(dataJSON);
                montagesMachines = recoveredData.machines || [];
              } catch (e) {
                console.error('Erreur décodage montage:', e);
              }
            }

            // Vérifier si la machine fait partie de ce montage
            if (montagesMachines.length > 0) {
              const machineInMontage = montagesMachines.find(
                (m: any) => m.machineId === machineId
              );

              if (machineInMontage) {
                // La machine fait partie d'un montage en cours !
                // On ouvre le protocole d'installation de ce montage
                console.log('Machine fait partie du montage en cours:', montage._id);
                onNavigate('installation-protocol', {
                  interventionId: intervention._id,
                  clientId: intervention.clientId,
                  machineId: machineId
                });
                return; // On arrête ici
              }
            }
          } catch (error) {
            console.error('Erreur récupération montage:', error);
          }
        }
      }

      // 3. Si on arrive ici, la machine ne fait pas partie d'un montage en cours
      // On ouvre le détail normal de la machine
      console.log('Machine non liée à un montage en cours, ouverture détail normal');
      onNavigate('client-machine-detail', { 
        clientId: client._id, 
        machineId: machineId 
      });

    } catch (error) {
      console.error('Erreur lors de la sélection de la machine:', error);
      // En cas d'erreur, on ouvre quand même le détail normal
      onNavigate('client-machine-detail', { 
        clientId: client._id, 
        machineId: machineId 
      });
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    await markAsRead(messageId);
    fetchMessages({ filter: { clientId: client._id } });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce message ?')) {
      await deleteMessage(messageId);
      fetchMessages({ filter: { clientId: client._id } });
    }
  };

  if (loadingClient || !client) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => onNavigate('clients')} className="flex items-center gap-2">
          <ArrowLeft size={20} />
          Retour
        </Button>
        <Card>
          <p className="text-gray-500">Chargement des informations du client...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientMessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        clientId={client._id}
        clientName={client.nom}
        onSendMessage={handleSendMessage}
        messages={clientMessages} 
        onMarkAsRead={handleMarkAsRead} 
        onDeleteMessage={handleDeleteMessage}
      />

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={() => onNavigate('clients')} className="flex items-center gap-2">
            <ArrowLeft size={20} />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white bg-blue-600 px-4 py-2 rounded-md inline-block">
              {client.nom}
            </h1>
            <p className="text-gray-600">N° {client.numeroClient}</p>
          </div>
        </div>

        <Card>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Informations client</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Building className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Ferme</p>
                    <p className="font-medium">{client.nomFerme || 'Non renseigné'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Adresse</p>
                    <p className="font-medium">{client.adresse || 'Non renseignée'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Téléphone</p>
                    <p className="font-medium">{client.telephone || 'Non renseigné'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{client.email || 'Non renseigné'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4">

              <Button
  variant="secondary"
  onClick={() => onNavigate('client-form', { 
  clientId: client._id,
  returnTo: 'client-detail',
  returnParams: { clientId: client._id }
})}
  className="flex items-center gap-2"
>
  <Edit size={20} />
  Modifier le client
</Button>
                <Button
                  onClick={() => onNavigate('machine-form', { clientId: client._id })}
                  className="flex items-center gap-2"
                >
                  <Plus size={20} />
                  Ajouter une machine
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => setShowMessageModal(true)}
                  className="flex items-center gap-2 relative"
                >
                  <MessageSquare size={20} />
                  Messages
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      {unreadMessagesCount}
                    </span>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => window.open(`https://maps.google.com/?q=${client.adresse}`, '_blank')}
                >
                  <MapPin size={20} />
                  Itinéraire
                </Button>
              </div>
            </div>
          </div>
        </Card>
        </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Machines ({clientMachines.length})
        </h2>

        {loadingMachines ? (
          <p className="text-gray-500">Chargement...</p>
        ) : clientMachines.length === 0 ? (
          <Card>
            <p className="text-gray-500">Aucune machine enregistrée</p>
          </Card>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={clientMachines.map(m => m._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientMachines.map((machine) => {
                  const maintenanceStatus = getMachineStatus(machine._id);
                  return (
                    <div key={machine._id} className="relative">
                      {maintenanceStatus && (
                        <div 
                          className="absolute -top-2 -right-2 text-2xl z-20 animate-pulse cursor-pointer hover:scale-110 transition-transform bg-white rounded-full shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate?.('maintenance-kit-selection', { machineId: machine._id });
                          }}
                          title="Faire l'entretien"
                        >
                          {maintenanceStatus}
                        </div>
                      )}
                      <SortableMachineCard
                        machine={machine}
                        client={client}
                        onNavigate={onNavigate}
                        onSelectMachine={handleSelectMachine}
                      />
                    </div>
                  );
                })}
              </div>
            </SortableContext>
        </DndContext>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Historique des interventions ({clientInterventions.length})
        </h2>

  {loadingInterventions ? (
  <p className="text-gray-500">Chargement...</p>
) : clientInterventions.length === 0 ? (
  <Card>
    <p className="text-gray-500">Aucune intervention enregistrée</p>
  </Card>
) : (
  <div className="space-y-3">
    {clientInterventions.slice(0, 10).map((intervention) => {
      const typeInfo = getInterventionTypeInfo(intervention.type);
      const typeColors = INTERVENTION_TYPE_COLORS[intervention.type] || INTERVENTION_TYPE_COLORS['REPAIR'];
      const statusRaw = (intervention.statut || 'PLANIFIEE').toUpperCase();
      const isFinished = statusRaw === 'TERMINEE';
      const isInProgress = statusRaw === 'EN_COURS';
      const isDeleted = statusRaw === 'SUPPRIMEE';

      return (
        <Card
          key={intervention._id}
          className={`hover:shadow-md transition-all cursor-pointer ${isFinished || isDeleted ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'}`}
          onClick={() => {
            switch (intervention.type) {
              case 'REPAIR':
                onNavigate('intervention-form', {
                  interventionId: intervention._id,
                  clientId: intervention.clientId,
                  machineId: intervention.machineIds?.[0],
                  readOnly: isFinished || isDeleted
                });
                break;
              case 'INSTALLATION':
                if (isInProgress) {
                  onNavigate('installation-protocol', {
                    interventionId: intervention._id,
                    clientId: intervention.clientId,
                    machineId: intervention.machineIds?.[0]
                  });
                } else if (isFinished || isDeleted) {
                  onNavigate('installation-protocol', {
                    interventionId: intervention._id,
                    clientId: intervention.clientId,
                    machineId: intervention.machineIds?.[0]
                  });
                } else {
                  onNavigate('intervention-form', {
                    interventionId: intervention._id,
                    clientId: intervention.clientId,
                    machineId: intervention.machineIds?.[0],
                    readOnly: false
                  });
                }
                break;
              case 'MAINTENANCE':
              case 'Entretien': {
                // Pour les interventions supprimées, ne pas permettre la navigation
                if (isDeleted) {
                  alert('Cette intervention a été supprimée et ne peut plus être modifiée.');
                  return;
                }
                const machineKitSelections = (intervention.kits || []).map((kit: any) => ({
                  machineId: kit.machineId,
                  kitId: kit.kitId
                }));
                const savedSectionsState = (intervention.selectedSections || []).map((s: any) => ({
                  machineId: s.machineId,
                  sectionName: s.sectionName,
                  tasks: s.tasks || []
                }));
                onNavigate('multi-machine-section-selection', {
                  clientId: intervention.clientId,
                  machineKitSelections,
                  resumeInterventionId: intervention._id,
                  savedSectionsState
                });
                break;
              }
              case 'COMMISSIONING':
                onNavigate('commissioning-protocol', {
                  interventionId: intervention._id,
                  clientId: intervention.clientId,
                  machineIds: intervention.machineIds || [],
                  readOnly: isFinished || isDeleted
                });
                break;
              default:
                onNavigate('intervention-form', {
                  interventionId: intervention._id,
                  clientId: intervention.clientId,
                  readOnly: isFinished || isDeleted
                });
                break;
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${typeColors.bg} ${typeColors.border} border flex-shrink-0`}>
                <span className="text-base">{typeInfo.emoji}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-base">
                    {intervention.numeroIntervention || 'N° En attente'}
                  </p>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeColors.bg} ${typeColors.border} ${typeColors.text} border`}>
                    {typeInfo.label}
                  </span>
                </div>
                {intervention.machineIds?.length > 0 && (
                  <p className="text-sm text-gray-500 truncate">
                    {machines.filter(m => intervention.machineIds.includes(m._id)).map(m => m.nom).join(', ') || 'Machine inconnue'}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(intervention.createdAt || intervention.dateDebut).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            {/* Statut avec bouton de réactivation */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {isDeleted && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    🗑️ Supprimée
                  </span>
                  <button
                    onClick={(e) => handleOpenReactivationModal(intervention._id, e)}
                    className="p-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-600 transition-colors"
                    title="Réactiver l'intervention"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              )}
              {isFinished && !isDeleted && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    ✅ Terminée
                  </span>
                  <button
                    onClick={(e) => handleOpenReactivationModal(intervention._id, e)}
                    className="p-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-600 transition-colors"
                    title="Réactiver l'intervention"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              )}
              {isInProgress && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    ⚙️ En cours
                  </span>
                  <button
                    onClick={(e) => handleCloseFromHistory(intervention._id, e)}
                    className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition-colors"
                    title="Clôturer l'intervention"
                  >
                    <CheckCircle size={14} />
                  </button>
                </div>
              )}
              {!isFinished && !isInProgress && !isDeleted && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                  📅 Planifiée
                </span>
              )}
            </div>
          </div>
        </Card>
      );
    })}
    
    {clientInterventions.length > 10 && (
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => onNavigate('interventions', { clientId })}
      >
        Voir toutes les interventions ({clientInterventions.length})
      </Button>
    )}
  </div>
)}

      </div>

      {/* Modal de réactivation */}
      {showReactivationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RotateCcw size={24} className="text-orange-600" />
              Réactiver l'intervention
            </h2>
            
            <p className="text-sm text-gray-600 mb-4">
              Cette action remettra l'intervention en statut "En cours". 
              Entrez le code de sécurité pour continuer.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code de sécurité
              </label>
              <input
                type="password"
                value={reactivationCode}
                onChange={(e) => setReactivationCode(e.target.value)}
                placeholder="Entrez le code"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleReactivateIntervention()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Le code de sécurité est requis pour réactiver une intervention terminée
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleReactivateIntervention}
                disabled={isReactivating || !reactivationCode}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-300"
              >
                {isReactivating ? '⏱️ Réactivation...' : '✅ Réactiver'}
              </Button>
              <Button
                onClick={handleCloseReactivationModal}
                variant="secondary"
                disabled={isReactivating}
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}