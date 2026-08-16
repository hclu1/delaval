// ClientPortalScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useClientMessages } from '../../hooks/useClientMessages';
import { useUsers } from '../../hooks/useUsers';
import { ClientMessageModal } from '../../components/domain/ClientMessageModal';
import { api } from '../../lib/api';

interface ClientPortalScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  clientId?: string;
}

export function ClientPortalScreen({ onNavigate, clientId: clientIdProp }: ClientPortalScreenProps) {
  const { user, userData } = useAuth();
  const [interventions, setInterventions] = useState<any[]>([]);
  const { messages, loading: messagesLoading, markAsRead } = useClientMessages();
  const { users } = useUsers();
  const [machines, setMachines] = useState<any[]>([]);

  const [currentClient, setCurrentClient] = useState<any>(null);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientMachines, setClientMachines] = useState<any[]>([]);
  const [clientMessages, setClientMessages] = useState<any[]>([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  // ✅ Charger le client directement via lumi (contourne les permissions de useClients)
  useEffect(() => {
    const loadClient = async () => {
      setClientsLoading(true);
      try {
        const clientId = clientIdProp || userData?.clientId;

        if (clientId) {
          // Chercher par ID en priorité
          const result = await api.entities.clients.list({
            filter: { _id: clientId },
            limit: 1
          });
          if (result.list && result.list.length > 0) {
            const client = result.list[0];
            setCurrentClient(client);
            // Charger les machines de ce client directement
            const mResult = await api.entities.machines.list({
              filter: { clientId: client._id },
              limit: 100
            });
            if (mResult.list) setMachines(mResult.list);
            // Charger les interventions du client
            const iResult = await api.entities.interventions.list({
              filter: { clientId: client._id },
              limit: 200
            });
            if (iResult.list) setInterventions(iResult.list);
            return;
          }
        }

        // Fallback par email
        const email = (user?.email || userData?.email || '').toLowerCase().trim();
        if (email) {
          const result = await api.entities.clients.list({
            filter: { email },
            limit: 1
          });
          if (result.list && result.list.length > 0) {
            const client = result.list[0];
            setCurrentClient(client);
            const mResult = await api.entities.machines.list({
              filter: { clientId: client._id },
              limit: 100
            });
            if (mResult.list) setMachines(mResult.list);
            const iResult = await api.entities.interventions.list({
              filter: { clientId: client._id },
              limit: 200
            });
            if (iResult.list) setInterventions(iResult.list);
          }
        }
      } catch (err) {
        console.error('[Portal] Erreur chargement client:', err);
      } finally {
        setClientsLoading(false);
      }
    };

    if (userData !== undefined) loadClient();
  }, [clientIdProp, userData, user]);

  // Machines déjà chargées directement dans loadClient
  useEffect(() => {
    setClientMachines(machines);
  }, [machines]);

  // Filtrer les messages du client
  useEffect(() => {
    if (currentClient?._id && messages.length > 0) {
      const filtered = messages.filter(m => m.client_id === currentClient._id);
      setClientMessages(filtered.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }
  }, [currentClient, messages]);

  const handleOpenMessage = async (message: any) => {
    setSelectedMessage(message);
    setIsMessageModalOpen(true);
    if (!message.read) await markAsRead(message._id);
  };

  const getTechnicianName = (technicianId: string) => {
    const tech = users.find(u => u._id === technicianId);
    return tech ? `${tech.prenom} ${tech.nom}` : 'N/A';
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getTermineeCount = (machineId: string) => {
    return interventions.filter(
      i => i.machineIds?.includes(machineId) && i.statut === 'TERMINEE'
    ).length;
  };

  // ── Chargement ──────────────────────────────────────────────────────────────
  if (clientsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Chargement de votre espace client...</p>
      </div>
    );
  }

  // ── Client non trouvé ───────────────────────────────────────────────────────
  if (!currentClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Accès client non trouvé</h2>
          <p className="text-gray-500 text-sm">
            Contactez SoplanÉlevage pour obtenir vos identifiants de connexion.
          </p>
        </Card>
      </div>
    );
  }

  // ── Portail client ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 md:p-8 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Bienvenue {currentClient.nom}
          </h1>
          <p className="text-blue-100 text-sm">Portail client SoplanÉlevage</p>
        </div>

        {/* Mes informations */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mes informations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Nom de la ferme</p>
              <p className="font-medium text-gray-900">{currentClient.nomFerme || currentClient.ferme || 'Non renseigné'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Adresse</p>
              <p className="font-medium text-gray-900">{currentClient.adresse || 'Non renseignée'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Téléphone</p>
              <p className="font-medium text-gray-900">{currentClient.telephone || 'Non renseigné'}</p>
            </div>
          </div>
        </Card>

        {/* Mes machines */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Mes machines ({clientMachines.length})
          </h2>

          {clientMachines.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune machine enregistrée</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientMachines.map(machine => {
                const rapportCount = getTermineeCount(machine._id);
                return (
                  <button
                    key={machine._id}
                    onClick={() => onNavigate('machine-detail', {
                      machineId: machine._id,
                      clientId: currentClient._id,
                      clientView: true
                    })}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {machine.nom || machine.name || 'Machine'}
                          </div>
                          <div className="text-xs text-gray-500">N° {machine.numeroSerie}</div>
                        </div>
                      </div>
                      {rapportCount > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full shrink-0">
                          {rapportCount} rapport{rapportCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {machine.compteur !== undefined && (
                      <div className="text-sm text-gray-600 flex gap-2">
                        <span className="text-gray-400">Compteur :</span>
                        <span className="font-medium text-blue-600">{machine.compteur}h</span>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-blue-600 font-medium group-hover:underline">
                        Voir les rapports →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Mes messages */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Mes messages ({clientMessages.filter(m => !m.read).length} non lus)
          </h2>

          {clientMessages.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun message</p>
          ) : (
            <div className="space-y-3">
              {clientMessages.map(message => (
                <div
                  key={message._id}
                  className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    !message.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                  }`}
                  onClick={() => handleOpenMessage(message)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {!message.read && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
                      <span className="text-sm font-medium text-gray-900">
                        {message.sender_id ? getTechnicianName(message.sender_id) : 'SoplanÉlevage'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDateTime(message.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{message.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>

      {isMessageModalOpen && selectedMessage && (
        <ClientMessageModal
          isOpen={isMessageModalOpen}
          onClose={() => { setIsMessageModalOpen(false); setSelectedMessage(null); }}
          clientId={currentClient._id}
          message={selectedMessage}
        />
      )}
    </div>
  );
}