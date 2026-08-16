//InterventionDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {ArrowLeft, Edit, Trash2, MapPin, Clock, User, Package, FileText, Plus} from 'lucide-react';
import { useInterventions } from '../../hooks/useInterventions';
import { useClients } from '../../hooks/useClients';
import { useMachines } from '../../hooks/useMachines';
import { useSpareParts } from '../../hooks/useSpareParts';
import { useUsers } from '../../hooks/useUsers';
import { INTERVENTION_TYPES } from '../../constants';
import { api } from '../../lib/api';
import { generateInterventionPDF } from '../../utils/pdfGenerator';
import { useVisibilityRefresh } from '../../hooks/useVisibilityRefresh';

interface InterventionDetailScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  interventionId: string;
  interventionData?: any;
  returnTo?: string;
  returnParams?: any;
}

export function InterventionDetailScreen({ 
  onNavigate, 
  interventionId, 
  interventionData,
  returnTo = 'interventions',
  returnParams = {}
}: InterventionDetailScreenProps) {
  const { clients, fetchClients } = useClients();
  const { machines, fetchMachines } = useMachines();
  const { spareParts, fetchSpareParts } = useSpareParts();
  const { users, fetchUsers } = useUsers();

  const [intervention, setIntervention] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [interventionMachines, setInterventionMachines] = useState<any[]>([]);
  const [usedParts, setUsedParts] = useState<any[]>([]);
  const [showAddPart, setShowAddPart] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadData();
  }, [interventionId, interventionData]);

  // Rafraîchissement automatique au retour sur l'app (smartphone)
  useVisibilityRefresh(loadData);

  const loadData = async () => {
    try {
      console.log('🔄 Chargement - ID:', interventionId);

      if (interventionData) {
        console.log('📦 Données passées disponibles');
        setIntervention(interventionData);
        
        if (clients.length > 0) {
          const foundClient = clients.find(c => c._id === interventionData.clientId);
          if (foundClient) setClient(foundClient);
        }
        if (machines.length > 0) {
          const foundMachines = machines.filter(m => interventionData.machineIds?.includes(m._id));
          if (foundMachines.length > 0) setInterventionMachines(foundMachines);
        }
      }

      await Promise.all([
        fetchClients({ limit: 100 }),
        fetchMachines({ limit: 100 }),
        fetchSpareParts({ limit: 100 }),
        fetchUsers({ limit: 100 })
      ]);

      if (!interventionId || interventionId === 'undefined' || interventionId === 'null') {
        console.error('❌ ID invalide:', interventionId);
        if (!interventionData) {
          alert('❌ Intervention introuvable: ID invalide');
          onNavigate('dashboard');
        }
        return;
      }

      try {
        await loadUsedParts();
      } catch (partsError) {
        console.error('⚠️ Erreur chargement pièces (non bloquant):', partsError);
        setUsedParts([]);
      }

      try {
        const interResult = await api.entities.interventions.get(interventionId);
        if (interResult && interResult._id) {
          console.log('✅ Intervention chargée depuis DB');
          setIntervention(interResult);
        } else {
          console.warn('⚠️ Intervention vide, utilisation des données locales');
          if (!interventionData) {
            alert('❌ Intervention non trouvée: ' + interventionId);
            onNavigate('dashboard');
          }
        }
      } catch (getError: any) {
        console.error('❌ Erreur get():', getError?.message || getError);
        if (interventionData) {
          console.log('✅ Utilisation des données passées en paramètre (fallback)');
        } else {
          alert('❌ Intervention non trouvée: ' + interventionId);
          onNavigate('dashboard');
        }
      }

    } catch (error: any) {
      console.error('❌ Erreur globale:', error?.message || error);
      if (!interventionData) {
        alert('❌ Erreur: Impossible de charger l\'intervention');
        onNavigate('dashboard');
      } else {
        console.log('✅ Affichage avec données locales malgré erreur réseau');
      }
    }
  };

  const loadUsedParts = async () => {
    try {
      const result = await api.entities.intervention_parts.list({
        filter: { interventionId: interventionId },
        limit: 100
      });
      
      if (!result.list || result.list.length === 0) {
        setUsedParts([]);
        return;
      }
      
      const partsWithDetails = await Promise.all(
        result.list.map(async (ip: any) => {
          try {
            const part = await api.entities.spare_parts.get(ip.partId);
            return {
              ...ip,
              designation: part?.designation || 'Pièce inconnue',
              reference: part?.reference || '-',
              prixUnitaire: part?.prixUnitaire || 0
            };
          } catch (error) {
            return {
              ...ip,
              designation: 'Pièce inconnue',
              reference: '-',
              prixUnitaire: 0
            };
          }
        })
      );
      
      setUsedParts(partsWithDetails);
    } catch (error) {
      console.error('❌ Erreur pièces:', error);
      setUsedParts([]);
    }
  };

  useEffect(() => {
    if (intervention && clients.length > 0) {
      const foundClient = clients.find(c => c._id === intervention.clientId);
      setClient(foundClient);
    }
    if (intervention && machines.length > 0) {
      const foundMachines = machines.filter(m => intervention.machineIds?.includes(m._id));
      setInterventionMachines(foundMachines);
    }
  }, [intervention, clients, machines]);

  const handleAddPart = async () => {
    if (!selectedPartId || quantity <= 0) {
      alert('Veuillez sélectionner une pièce et une quantité valide');
      return;
    }

    try {
      await api.entities.intervention_parts.create({
        interventionId,
        partId: selectedPartId,
        quantite: quantity,
        creator: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const part = spareParts.find(p => p._id === selectedPartId);
      if (part && part.stock >= quantity) {
        await api.entities.spare_parts.update(selectedPartId, {
          stock: part.stock - quantity,
          updatedAt: new Date().toISOString()
        });
      }

      alert('✅ Pièce ajoutée avec succès');
      setShowAddPart(false);
      setSelectedPartId('');
      setQuantity(1);
      
      await loadUsedParts();
      await fetchSpareParts({ limit: 100 });
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur lors de l\'ajout de la pièce');
    }
  };

  const handleCloseIntervention = async () => {
    if (confirm('Êtes-vous sûr de vouloir clôturer cette intervention ?')) {
      try {
        const now = new Date().toISOString();
        const dateDebut = new Date(intervention.dateDebut);
        const dateFin = new Date(now);
        const dureeMinutes = Math.round((dateFin.getTime() - dateDebut.getTime()) / 60000);

        await api.entities.interventions.update(interventionId, {
          statut: 'TERMINEE',
          dateFin: now,
          duree: dureeMinutes,
          updatedAt: now
        });

        alert('✅ Intervention clôturée avec succès');
        setIntervention({
          ...intervention,
          statut: 'TERMINEE',
          dateFin: now,
          duree: dureeMinutes
        });
      } catch (error) {
        console.error('❌ ERREUR:', error);
        alert('❌ Erreur lors de la clôture');
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      try {
        await api.entities.interventions.delete(interventionId);
        alert('Intervention supprimée');
        onNavigate(returnTo, returnParams);
      } catch (error) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const openInMaps = () => {
    if (intervention?.gpsLat && intervention?.gpsLng) {
      const url = `https://www.google.com/maps?q=${intervention.gpsLat},${intervention.gpsLng}`;
      window.open(url, '_blank');
    }
  };

  if (!intervention) {
    return (
      <Card className="text-center py-12">
        <p className="text-gray-500">Chargement de l'intervention...</p>
      </Card>
    );
  }

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

  const isFinished = intervention.statut === 'TERMINEE';
  const isCommissioning = intervention?.type === 'COMMISSIONING';
  const isMaintenance = intervention?.type === 'MAINTENANCE';
  const hasProtocolData = !!intervention?.protocolData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={() => onNavigate(returnTo, returnParams)} className="flex items-center gap-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {INTERVENTION_TYPES[intervention.type]?.label || intervention.type}
              </h1>
              <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${getStatusColor(intervention.statut)}`}>
                {getStatusLabel(intervention.statut)}
              </span>
              {isFinished && (
                <span className="text-xs font-bold text-gray-500 uppercase border border-gray-300 px-2 py-1 rounded">Historique Figé</span>
              )}
            </div>
            <p className="text-gray-600">
              N° {intervention.numeroIntervention || intervention.numero_intervention || (intervention.protocolData?.session?.numeroIntervention) || 'En attente'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!isFinished && !isCommissioning && !isMaintenance && (
            <Button variant="primary" onClick={handleCloseIntervention} className="flex items-center gap-2 bg-orange-400 hover:bg-orange-500 text-white">
              <Clock size={18} />
              Clôturer
            </Button>
          )}

          {isCommissioning ? (
            <Button 
              variant="primary" 
              onClick={() => onNavigate('commissioning-protocol', { 
                interventionId: intervention._id, 
                clientId: intervention.clientId,
                machineIds: intervention.machineIds 
              })} 
              className={`flex items-center gap-2 ${hasProtocolData ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
            >
              <FileText size={18} />
              {hasProtocolData ? '📋 Voir Protocole' : '🚀 Démarrer le Protocole'}
            </Button>
          ) : isMaintenance ? (
            <Button 
              variant="primary" 
              onClick={() => onNavigate('maintenance-protocol', { 
                interventionId: intervention._id, 
                clientId: intervention.clientId,
                machineIds: intervention.machineIds 
              })} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText size={18} />
              {intervention.totalTaches ? '📋 Continuer l\'entretien' : '🚀 Démarrer l\'entretien'}
            </Button>
          ) : (
            !isFinished && (
              <Button variant="secondary" onClick={() => onNavigate('intervention-form', { interventionId })} className="flex items-center gap-2">
                <Edit size={18} />
                Modifier
              </Button>
            )
          )}
          
          {!isFinished && (
            <Button variant="danger" onClick={handleDelete} className="flex items-center gap-2">
              <Trash2 size={18} />
              Supprimer
            </Button>
          )}
        </div>
      </div>
{/* BANDEAU EN HAUT : Client + Machine + Adresse automatiquement */}
      {(client || interventionMachines.length > 0) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
          
          {/* Nom du client */}
          {client && (
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-blue-600 text-white rounded-lg p-2">
                <User size={20} />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase">Client</p>
                <p className="font-bold text-gray-900">{client.nom}</p>
                <p className="text-sm text-gray-500">{client.nomFerme}</p>
              </div>
            </div>
          )}

          {/* Nom de la machine */}
          {interventionMachines.length > 0 && (
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-green-600 text-white rounded-lg p-2">
                <Package size={20} />
              </div>
              <div>
                <p className="text-xs text-green-600 font-semibold uppercase">Machine</p>
                <p className="font-bold text-gray-900">{interventionMachines.map(m => m.nom).join(', ')}</p>
                {interventionMachines.length === 1 && (
                  <p className="text-sm text-gray-500">N° {interventionMachines[0].numeroSerie}</p>
                )}
              </div>
            </div>
          )}

          {/* Adresse du client */}
          {client && (client.adresse || client.ville) && (
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-orange-500 text-white rounded-lg p-2">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xs text-orange-600 font-semibold uppercase">Adresse</p>
                <p className="font-bold text-gray-900">{client.adresse}</p>
                <p className="text-sm text-gray-500">{client.codePostal} {client.ville}</p>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock size={20} /> Informations générales</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">{INTERVENTION_TYPES[intervention.type]?.label || intervention.type}</span>
            </div>
            {intervention.technicien && (
              <div className="flex justify-between">
                <span className="text-gray-600">Technicien:</span>
                <span className="font-medium">{intervention.technicien}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Début:</span>
              <span className="font-medium">{new Date(intervention.dateDebut).toLocaleString('fr-FR')}</span>
            </div>
            {intervention.dateFin && (
              <div className="flex justify-between">
                <span className="text-gray-600">Fin:</span>
                <span className="font-medium">{new Date(intervention.dateFin).toLocaleString('fr-FR')}</span>
              </div>
            )}
            {intervention.duree && (
              <div className="flex justify-between">
                <span className="text-gray-600">Durée:</span>
                <span className="font-medium text-blue-600">{intervention.duree} min</span>
              </div>
            )}
            {isCommissioning && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="text-sm font-semibold text-purple-700">
                  {hasProtocolData ? '📋 Protocole enregistré' : '⚠️ Protocole non commencé'}
                </span>
              </div>
            )}
            {isMaintenance && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="text-sm font-semibold text-blue-700">
                  {intervention.totalTaches ? `🔧 ${intervention.tachesCompletees || 0}/${intervention.totalTaches} tâches` : '⚠️ Entretien non commencé'}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><User size={20} /> Client</h2>
          {client ? (
            <div className="space-y-2">
              <div className="font-medium text-lg">{client.nom}</div>
              <div className="text-gray-600">{client.nomFerme}</div>
              <div className="text-sm text-gray-500">{client.adresse}, {client.codePostal} {client.ville}</div>
              <div className="text-sm text-gray-600">N° {client.numeroClient}</div>
            </div>
          ) : (
            <p className="text-gray-500">Client non trouvé</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Machines concernées</h2>
        {interventionMachines.length === 0 ? (
          <p className="text-gray-500">Aucune machine</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interventionMachines.map(machine => (
              <div key={machine._id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors" onClick={() => onNavigate('machine-detail', { machineId: machine._id })}>
                <div className="font-medium text-lg">{machine.nom}</div>
                <div className="text-sm text-gray-600">N° {machine.numeroSerie}</div>
                <div className="text-xs text-gray-500 mt-1">Compteur: {machine.compteur}h</div>
              </div>
            ))}
          </div>
        )}
      </Card>

     {/* ✅ SECTION MAINTENANCE (affichée si type MAINTENANCE avec données) */}
{isMaintenance && (intervention.totalTaches || intervention.actionsRealisees) && (
  <Card className="bg-blue-50 border-blue-200">
    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
      🔧 Données de l'entretien
    </h2>
    
    <div className="space-y-3">
      {/* Progression des tâches */}
      {intervention.totalTaches && (
        <div className="bg-white p-3 rounded border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-blue-900">Progression de l'entretien</span>
            <span className="font-bold text-blue-600">
              {intervention.tachesCompletees || 0} / {intervention.totalTaches} tâches
              {intervention.totalTaches > 0 && 
                ` (${Math.round(((intervention.tachesCompletees || 0) / intervention.totalTaches) * 100)}%)`
              }
            </span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${intervention.totalTaches > 0 ? ((intervention.tachesCompletees || 0) / intervention.totalTaches) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Actions réalisées de l'entretien */}
      {intervention.actionsRealisees && (
        <div className="bg-white p-3 rounded border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-2">⚙️ Actions réalisées</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{intervention.actionsRealisees}</p>
        </div>
      )}
    </div>
  </Card>
)}

     {/* ✅ SECTION PROTOCOLDATA POUR TOUS LES TYPES */}
{hasProtocolData && (
  <Card className="bg-purple-50 border-purple-200">
    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
      📋 Données enregistrées pendant l'intervention
    </h2>
    
    <div className="space-y-3">
      {/* Diagnostics */}
      {intervention.protocolData.diagnostics && intervention.protocolData.diagnostics.length > 0 && (
        <div className="bg-white p-3 rounded border border-purple-100">
          <h3 className="font-semibold text-purple-900 mb-2">🔍 Diagnostics effectués</h3>
          <div className="space-y-2">
            {intervention.protocolData.diagnostics.map((diag: any, index: number) => (
              <div key={index} className="p-2 bg-purple-50 rounded">
                <div className="font-medium text-sm">{diag.titre || diag.title}</div>
                <div className="text-xs text-gray-600 mt-1">
                  Statut: <span className={`font-semibold ${diag.statut === 'OK' ? 'text-green-600' : 'text-red-600'}`}>
                    {diag.statut}
                  </span>
                </div>
                {diag.remarque && (
                  <div className="text-xs text-gray-700 mt-1 italic">{diag.remarque}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Actions réalisées du protocole */}
      {intervention.protocolData.actions && intervention.protocolData.actions.length > 0 && (
        <div className="bg-white p-3 rounded border border-purple-100">
          <h3 className="font-semibold text-purple-900 mb-2">⚙️ Actions réalisées</h3>
          <ul className="space-y-1 list-disc list-inside text-sm text-gray-700">
            {intervention.protocolData.actions.map((action: any, index: number) => (
              <li key={index}>{action.description || action.titre || action}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Travaux du protocole */}
      {intervention.protocolData.travaux && intervention.protocolData.travaux.length > 0 && (
        <div className="bg-white p-3 rounded border border-purple-100">
          <h3 className="font-semibold text-purple-900 mb-2">🛠️ Travaux effectués</h3>
          <ul className="space-y-1 list-disc list-inside text-sm text-gray-700">
            {intervention.protocolData.travaux.map((travail: any, index: number) => (
              <li key={index}>{travail.description || travail.titre || travail}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Pièces utilisées du protocole */}
      {intervention.protocolData.pieces && intervention.protocolData.pieces.length > 0 && (
        <div className="bg-white p-3 rounded border border-purple-100">
          <h3 className="font-semibold text-purple-900 mb-2">📦 Pièces utilisées (protocole)</h3>
          <div className="space-y-2">
            {intervention.protocolData.pieces.map((piece: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 bg-purple-50 rounded text-sm">
                <span className="font-medium">{piece.designation || piece.partId}</span>
                <span className="text-gray-600">Qté: {piece.quantity || piece.quantite}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Constatations du protocole */}
      {intervention.protocolData.constatations && (
        <div className="bg-white p-3 rounded border border-purple-100">
          <h3 className="font-semibold text-purple-900 mb-2">🔍 Constatations</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{intervention.protocolData.constatations}</p>
        </div>
      )}
      
      {/* Remarques générales */}
      {intervention.protocolData.remarques && (
        <div className="bg-white p-3 rounded border border-purple-100">
          <h3 className="font-semibold text-purple-900 mb-2">📝 Remarques</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{intervention.protocolData.remarques}</p>
        </div>
      )}
      
      {/* Observations */}
      {intervention.protocolData.observations && (
        <div className="bg-white p-3 rounded border border-purple-100">
          <h3 className="font-semibold text-purple-900 mb-2">📝 Observations</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{intervention.protocolData.observations}</p>
        </div>
      )}
      
      {/* Recommandations */}
      {intervention.protocolData.recommandations && (
        <div className="bg-white p-3 rounded border border-purple-100">
          <h3 className="font-semibold text-purple-900 mb-2">💡 Recommandations</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{intervention.protocolData.recommandations}</p>
        </div>
      )}
      
      {/* Progression */}
      {intervention.protocolData.progression !== undefined && (
        <div className="bg-white p-3 rounded border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-purple-900">Progression</span>
            <span className="font-bold text-purple-600">{intervention.protocolData.progression}%</span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${intervention.protocolData.progression}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Statut de résolution du protocole */}
      {intervention.protocolData.resolu !== undefined && (
        <div className="bg-white p-3 rounded border border-purple-100">
          <h3 className="font-semibold text-purple-900 mb-2">✅ Statut de résolution</h3>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-lg ${intervention.protocolData.resolu ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
            {intervention.protocolData.resolu ? '✅ Problème résolu' : '⚠️ Problème non résolu'}
          </div>
        </div>
      )}
    </div>
  </Card>
)}

{/* Description classique (si remplie) */}
{intervention.description && (
  <Card>
    <h2 className="text-lg font-bold text-gray-900 mb-4">Description</h2>
    <p className="text-gray-700 whitespace-pre-wrap">{intervention.description}</p>
  </Card>
)}

{/* Champs classiques (affichés UNIQUEMENT si protocolData n'existe pas ET ce n'est pas une MAINTENANCE) */}
{!hasProtocolData && !isMaintenance && (
  <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {intervention.constatations && (
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 Constatations</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{intervention.constatations}</p>
        </Card>
      )}
      
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">🔧 Diagnostic</h2>
        {intervention.diagnostic ? (
          <p className="text-gray-700 whitespace-pre-wrap">{intervention.diagnostic}</p>
        ) : (
          <p className="text-gray-500 italic">Aucun diagnostic renseigné</p>
        )}
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">⚙️ Actions réalisées</h2>
        {intervention.actionsRealisees ? (
          <p className="text-gray-700 whitespace-pre-wrap">{intervention.actionsRealisees}</p>
        ) : (
          <p className="text-gray-500 italic">Aucune action renseignée</p>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">🛠️ Travaux effectués</h2>
        {intervention.travauxEffectues ? (
          <p className="text-gray-700 whitespace-pre-wrap">{intervention.travauxEffectues}</p>
        ) : (
          <p className="text-gray-500 italic">Aucun travaux renseignés</p>
        )}
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">✅ Statut de résolution</h2>
        {intervention.resolu !== undefined ? (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-lg ${intervention.resolu ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
            {intervention.resolu ? '✅ Problème résolu' : '⚠️ Problème non résolu'}
          </div>
        ) : (
          <p className="text-gray-500 italic">Statut non renseigné</p>
        )}
      </Card>

      {intervention.piecesUtilisees && typeof intervention.piecesUtilisees === 'string' && !intervention.piecesUtilisees.startsWith('[') && (
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">📦 Pièces remplacées (texte)</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{intervention.piecesUtilisees}</p>
        </Card>
      )}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {intervention.recommandations && (
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">💡 Recommandations</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{intervention.recommandations}</p>
        </Card>
      )}
      {intervention.observations && (
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">📝 Observations</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{intervention.observations}</p>
        </Card>
      )}
    </div>
  </>
)}


      {intervention.gpsLat && intervention.gpsLng && (
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPin size={20} /> Géolocalisation</h2>
          <div className="flex items-center justify-between">
            <div className="text-gray-700">Lat: {intervention.gpsLat} / Lng: {intervention.gpsLng}</div>
            <Button onClick={openInMaps} variant="secondary" size="sm">Ouvrir Maps</Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Package size={20} /> Pièces détachées utilisées</h2>
          {!isFinished && (
            <Button variant="secondary" size="sm" onClick={() => setShowAddPart(!showAddPart)} className="flex items-center gap-2">
              <Plus size={18} /> Ajouter
            </Button>
          )}
        </div>

        {showAddPart && !isFinished && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={selectedPartId} onChange={(e) => setSelectedPartId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Sélectionner une pièce</option>
                {spareParts.filter(p => p.stock > 0).map(part => (
                  <option key={part._id} value={part._id}>{part.designation} (Stock: {part.stock})</option>
                ))}
              </select>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Qté" />
              <Button onClick={handleAddPart} variant="primary" size="sm">Confirmer</Button>
            </div>
          </div>
        )}

        {usedParts.length === 0 ? (
          <p className="text-gray-500 italic">Aucune pièce utilisée</p>
        ) : (
          <div className="space-y-2">
            {usedParts.map((part: any, index: number) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <div className="font-medium">{part.designation}</div>
                  <div className="text-sm text-gray-600">Réf: {part.reference}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">Qté: {part.quantite}</div>
                  <div className="text-sm text-gray-600">{part.prixUnitaire}€</div>
                </div>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t-2 border-gray-200">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-blue-600">{usedParts.reduce((sum, p) => sum + (p.quantite * p.prixUnitaire), 0).toFixed(2)}€</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {intervention.statut === 'TERMINEE' && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileText className="text-blue-600 mt-1" size={24} />
              <div>
                <h3 className="font-bold text-gray-900">Rapport d'intervention</h3>
                <p className="text-sm text-gray-600">Générer et télécharger le rapport PDF</p>
              </div>
            </div>
            <Button variant="primary" onClick={async () => {
              try {
                const pdf = await generateInterventionPDF({ intervention, client, machines: interventionMachines, usedParts });
                pdf.save(`intervention-${intervention.numeroIntervention}.pdf`);
              } catch (error) {
                console.error('Erreur génération PDF:', error);
                alert('Erreur lors de la génération du PDF');
              }
            }} className="flex items-center gap-2">
              <FileText size={18} /> Générer le rapport
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}