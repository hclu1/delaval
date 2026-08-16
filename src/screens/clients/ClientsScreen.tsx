import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { SearchBar } from '../../components/common/SearchBar';
import { Button } from '../../components/common/Button';
import {Plus, Users, Loader2} from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useMachines } from '../../hooks/useMachines';
import { useClientMessages } from '../../hooks/useClientMessages';
import { useMaintenanceMonitoring } from '../../hooks/useMaintenanceMonitoring';
import { ClientDetailCard } from '../../components/domain/ClientDetailCard';
import { useVisibilityRefresh } from '../../hooks/useVisibilityRefresh';

interface ClientsScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}

export function ClientsScreen({ onNavigate }: ClientsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [messagesEnabled, setMessagesEnabled] = useState(false);
  const [messagesChecked, setMessagesChecked] = useState(false);
  
  const { clients, loading: loadingClients, fetchClients } = useClients();
  const { machines, fetchMachines } = useMachines();
  const { fetchMessages } = useClientMessages();
  const { getMachineStatus } = useMaintenanceMonitoring();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ÉTAPE 1 - Charger machines, clients et vérifier messages au démarrage
  useEffect(() => {
    // Charger les machines et les clients en parallèle pour ne pas bloquer l'un ou l'autre
    fetchMachines({ limit: 2000 });
    fetchClients({ filter: {}, limit: 5000 });
    
    fetchMessages({})
      .then(() => { setMessagesEnabled(true); setMessagesChecked(true); })
      .catch(() => { setMessagesEnabled(false); setMessagesChecked(true); });
  }, []);

  // Rafraîchissement automatique au retour sur l'app (smartphone)
  useVisibilityRefresh(() => { 
    fetchMachines({ limit: 2000 }); 
    fetchClients({ filter: {}, limit: 5000 }); 
  });

  // Rafraîchissement automatique des messages toutes les 30s
  useEffect(() => {
    if (!messagesEnabled) return;
    const interval = setInterval(() => { fetchMessages({}).catch(() => {}); }, 30000);
    return () => clearInterval(interval);
  }, [messagesEnabled]);

  const clientIdsWithMachines = useMemo(() => {
    return new Set(machines.map((m: any) => m.clientId).filter(Boolean));
  }, [machines]);

  const getMachineCount = (clientId: string) => {
    return machines.filter(m => m.clientId === clientId).length;
  };

  // Obtenir le statut des machines du client
  const getClientMachinesStatus = (clientId: string) => {
    const clientMachines = machines.filter(m => m.clientId === clientId);
    const statuses = clientMachines.map(m => getMachineStatus(m._id)).filter(Boolean);
    
    // Retourner le statut le plus urgent
    if (statuses.includes('🔴')) return '🔴';
    if (statuses.includes('🟠')) return '🟠';
    if (statuses.includes('🟢')) return '🟢';
    return null;
  };

  const handleNavigateToClient = (screen: string, params: any) => {
    setIsNavigating(true);
    onNavigate(screen, params);
    setTimeout(() => setIsNavigating(false), 500);
  };

  // Recherche côté client
  const filteredClients = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) {
      // Par défaut (sans recherche), on n'affiche que les clients qui ont au moins une machine
      return clients
        .filter(client => clientIdsWithMachines.has(client._id))
        .slice(0, 100);
    }
    // S'il y a une recherche, on affiche tous les clients correspondants (avec ou sans machine)
    return clients.filter((client) =>
      client.nom?.toLowerCase().includes(query) ||
      client.nomFerme?.toLowerCase().includes(query) ||
      client.numeroClient?.toLowerCase().includes(query)
    ).slice(0, 100);
  }, [clients, debouncedSearch, clientIdsWithMachines]);

  return (
    <div className="space-y-6 relative">
      {isNavigating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-xl font-bold text-gray-900">Chargement du client...</p>
          </div>
        </div>
      )}

      {messagesChecked && !messagesEnabled && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-2 text-yellow-800">
            <span className="text-xl">⚠️</span>
            <p className="text-sm">
              <strong>Messages désactivés :</strong> Les permissions de la collection "clientmessages"
              doivent être configurées dans Lumi (NO_RESTRICTIONS pour read/insert/edit/delete)
            </p>
          </div>
        </Card>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Gérez vos clients et leurs machines</p>
        </div>
        <Button onClick={() => onNavigate('client-form')} className="flex items-center gap-2">
          <Plus size={20} />
          Nouveau client
        </Button>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Rechercher un client (nom, ferme, numéro)..."
        className="max-w-md"
      />

      {loadingClients ? (
        <Card className="text-center py-12">
          <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
          <p className="text-gray-500">Chargement des clients...</p>
        </Card>
      ) : filteredClients.length === 0 ? (
        <Card className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            {searchQuery ? `Aucun client trouvé pour "${searchQuery}"` : 'Aucun client avec machines enregistré'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const maintenanceStatus = getClientMachinesStatus(client._id);
            return (
              <div key={client._id} className="relative">
                {maintenanceStatus && (
                  <div className="absolute -top-2 -right-2 text-2xl z-10 animate-pulse">
                    {maintenanceStatus}
                  </div>
                )}
                <ClientDetailCard
                  client={client}
                  machinesCount={getMachineCount(client._id)}
                  onViewDetails={() => handleNavigateToClient('client-detail', { clientId: client._id })}
                  onViewMachines={() => handleNavigateToClient('machines', { clientId: client._id })}
                  onCreateIntervention={() => handleNavigateToClient('intervention-form', { clientId: client._id })}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}