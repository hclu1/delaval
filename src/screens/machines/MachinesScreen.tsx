import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { SearchBar } from '../../components/common/SearchBar';
import { Button } from '../../components/common/Button';
import {Plus, Settings, ArrowLeft} from 'lucide-react';
import { useMachines } from '../../hooks/useMachines';
import { useClients } from '../../hooks/useClients';
import { MachineCard } from '../../components/domain/MachineCard';
import { useVisibilityRefresh } from '../../hooks/useVisibilityRefresh';

interface MachinesScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  clientId?: string;
}

export function MachinesScreen({ onNavigate, clientId }: MachinesScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const { machines, loading, fetchMachines } = useMachines();
  const { clients, fetchClients } = useClients();

  useEffect(() => {
    // On demande un peu plus si on veut être sûr d'avoir toutes les machines d'un client
    fetchMachines({ limit: 1000 });
    fetchClients({ limit: 1000 });
  }, []);

  // Rafraîchissement automatique au retour sur l'app (smartphone)
  useVisibilityRefresh(() => fetchMachines({ limit: 1000 }));

  const clientName = clientId ? clients.find(c => c._id === clientId)?.nom : null;

  const filteredMachines = machines.filter(machine => {
    if (clientId && machine.clientId !== clientId) return false;

    const matchesSearch = 
      machine.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      machine.numeroSerie?.toLowerCase().includes(searchQuery.toLowerCase());
    // ✅ CORRECTION : Utilisation des valeurs françaises pour correspondre au formulaire
    const matchesType = selectedType === 'all' || machine.typeRelation === selectedType;
    return matchesSearch && matchesType;
  });

  // ✅ CORRECTION : Harmonisation des valeurs avec MachineFormScreen (MAITRE, ESCLAVE, etc.)
  const machineTypes = [
    { value: 'all', label: 'Tous les types' },
    { value: 'MAITRE', label: 'Maître' },
    { value: 'ESCLAVE', label: 'Esclave' },
    { value: 'PARENT', label: 'Parent' },
    { value: 'ENFANT', label: 'Enfant' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          {clientId && (
            <Button variant="ghost" onClick={() => onNavigate('clients')} className="p-2">
              <ArrowLeft size={24} />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {clientId ? `Machines de ${clientName || '...'}` : 'Machines'}
            </h1>
            <p className="text-gray-600 mt-1">
              {clientId ? 'Gérez les machines de ce client' : 'Gérez toutes les machines installées'}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => onNavigate('machine-form', clientId ? { clientId } : undefined)} 
          className="flex items-center gap-2"
        >
          <Plus size={20} />
          Nouvelle machine
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher une machine..."
          className="flex-1"
        />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {machineTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Card className="text-center py-12">
          <p className="text-gray-500">Chargement des machines...</p>
        </Card>
      ) : filteredMachines.length === 0 ? (
        <Card className="text-center py-12">
          <Settings size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            {searchQuery || selectedType !== 'all' 
              ? 'Aucune machine trouvée pour ces critères' 
              : 'Aucune machine enregistrée'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMachines.map((machine) => (
            <MachineCard
              key={machine._id}
              machine={machine}
              showClientInfo={true}
              onSelect={() => onNavigate('machine-detail', { machineId: machine._id })}
              // ✅ CORRECT : Navigation vers le formulaire avec l'ID (Mode Édition)
              onEdit={() => onNavigate('machine-form', { machineId: machine._id })}
              onIntervention={() => onNavigate('intervention-form', { 
                machineId: machine._id,
                clientId: machine.clientId 
              })}
              onHistory={() => onNavigate('machine-detail', { machineId: machine._id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}