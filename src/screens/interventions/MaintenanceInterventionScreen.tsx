//MaintenanceInterventionScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {ArrowLeft, Check, Edit, Trash2, X} from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useMachines } from '../../hooks/useMachines';
import { useMaintenanceKits } from '../../hooks/useMaintenanceKits';
import { useTachesEntretien } from '../../hooks/useTachesEntretien';
import { useInterventions } from '../../hooks/useInterventions';

interface MaintenanceInterventionScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  clientId: string;
}

interface MachineConfig {
  machineId: string;
  machineNom: string;
  kitId: string;
  kitNom: string;
  sections: {
    nom: string;
    tasksCount: number;
    taskIds: string[];
  }[];
}

export function MaintenanceInterventionScreen({ onNavigate, clientId }: MaintenanceInterventionScreenProps) {
  const { clients, fetchClients } = useClients();
  const { machines, fetchMachines } = useMachines();
  const { getKitsByMachineType } = useMaintenanceKits();
  const { getSectionsByKit } = useTachesEntretien();
  const { createIntervention } = useInterventions();

  const [client, setClient] = useState<any>(null);
  const [clientMachines, setClientMachines] = useState<any[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<MachineConfig[]>([]);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMachine, setCurrentMachine] = useState<any>(null);
  const [isEditingMachine, setIsEditingMachine] = useState(false);
  const [availableKits, setAvailableKits] = useState<any[]>([]);
  const [selectedKit, setSelectedKit] = useState<string>('');
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients({ limit: 100 });
    fetchMachines({ limit: 100 });
  }, []);

  useEffect(() => {
    if (clientId && clients.length > 0) {
      const foundClient = clients.find(c => c._id === clientId);
      setClient(foundClient);
    }
  }, [clientId, clients]);

  useEffect(() => {
    if (client && machines.length > 0) {
      const filtered = machines.filter(m => m.clientId === client._id);
      setClientMachines(filtered);
    }
  }, [client, machines]);

  const isMachineSelected = (machineId: string) => {
    return selectedMachines.some(m => m.machineId === machineId);
  };

  const openMachineModal = async (machine: any, editMode: boolean = false) => {
    setCurrentMachine(machine);
    setIsEditingMachine(editMode);
    setLoading(true);
    
    try {
      const kits = await getKitsByMachineType(machine.typeRelation || 'V300');
      setAvailableKits(kits);
      
      if (editMode) {
        const config = selectedMachines.find(m => m.machineId === machine._id);
        if (config) {
          setSelectedKit(config.kitId);
          const sections = await getSectionsByKit(config.kitId);
          setAvailableSections(sections);
          setSelectedSections(config.sections.map(s => s.nom));
        }
      } else if (kits.length > 0) {
        setSelectedKit(kits[0].kitId);
        const sections = await getSectionsByKit(kits[0].kitId);
        setAvailableSections(sections);
        setSelectedSections([]);
      }
      
      setModalVisible(true);
    } catch (error) {
      console.error('Erreur chargement kits:', error);
      alert('Erreur lors du chargement des kits d\'entretien');
    } finally {
      setLoading(false);
    }
  };

  const handleKitChange = async (kitId: string) => {
    setSelectedKit(kitId);
    setSelectedSections([]);
    
    try {
      const sections = await getSectionsByKit(kitId);
      setAvailableSections(sections);
    } catch (error) {
      console.error('Erreur chargement sections:', error);
    }
  };

  const toggleSection = (sectionName: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    );
  };

  const addOrUpdateMachine = () => {
    if (selectedSections.length === 0) {
      alert('Veuillez sélectionner au moins une section');
      return;
    }

    const kit = availableKits.find(k => k.kitId === selectedKit);
    
    const machineConfig: MachineConfig = {
      machineId: currentMachine._id,
      machineNom: currentMachine.nom,
      kitId: kit.kitId,
      kitNom: kit.nom,
      sections: selectedSections.map(sectionName => {
        const section = availableSections.find(s => s.nom === sectionName);
        return {
          nom: sectionName,
          tasksCount: section?.count || 0,
          taskIds: section?.taches.map((t: any) => t.idTache) || []
        };
      })
    };

    if (isEditingMachine) {
      setSelectedMachines(prev =>
        prev.map(m => m.machineId === currentMachine._id ? machineConfig : m)
      );
    } else {
      setSelectedMachines(prev => [...prev, machineConfig]);
    }

    closeModal();
  };

  const removeMachine = (machineId: string) => {
    setSelectedMachines(prev => prev.filter(m => m.machineId !== machineId));
  };

  const closeModal = () => {
    setModalVisible(false);
    setCurrentMachine(null);
    setIsEditingMachine(false);
    setSelectedKit('');
    setAvailableKits([]);
    setAvailableSections([]);
    setSelectedSections([]);
  };

  const calculateTotals = () => {
    const totalMachines = selectedMachines.length;
    const totalSections = selectedMachines.reduce((sum, m) => sum + m.sections.length, 0);
    const totalTasks = selectedMachines.reduce((sum, m) => 
      sum + m.sections.reduce((s, sec) => s + sec.tasksCount, 0), 0
    );
    return { totalMachines, totalSections, totalTasks };
  };

  const calculateModalTotalTasks = () => {
    return selectedSections.reduce((sum, sectionName) => {
      const section = availableSections.find(s => s.nom === sectionName);
      return sum + (section?.count || 0);
    }, 0);
  };

  const handleCreateIntervention = async () => {
    if (selectedMachines.length === 0) {
      alert('Veuillez sélectionner au moins une machine');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const numeroIntervention = 
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        'TECH001'.slice(-3);

      const interventionData = {
        numeroIntervention,
        type: 'MAINTENANCE',
        clientId: client._id,
        clientNom: `${client.nom} - ${client.nomFerme}`,
        technicienId: 'TECH001',
        statut: 'EN_COURS',
        dateDebut: now.toISOString(),
        machines: selectedMachines.map(m => ({
          machineId: m.machineId,
          machineNom: m.machineNom,
          kitId: m.kitId,
          kitNom: m.kitNom,
          sections: m.sections.map(s => ({
            sectionNom: s.nom,
            tachesIds: s.taskIds,
            tachesCompletees: [],
            progression: 0
          }))
        })),
        tachesCompletees: [],
        progressionGlobale: 0,
        totalTaches: calculateTotals().totalTasks,
        tachesCompleteesCount: 0,
        geolocalisation: {
          actif: true,
          dernierePosition: null,
          derniereMaj: now.toISOString()
        },
        clotureeManuallement: false,
        creator: 'system',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      await createIntervention(interventionData);
      alert('✅ Intervention d\'entretien créée avec succès !');
      onNavigate('interventions');
    } catch (error) {
      console.error('Erreur création intervention:', error);
      alert('❌ Erreur lors de la création de l\'intervention');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const modalTotalTasks = calculateModalTotalTasks();

  if (!client) {
    return (
      <Card className="text-center py-12">
        <p className="text-gray-500">Chargement du client...</p>
      </Card>
    );
  }

  return (
    <>
      {/* Contenu principal */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => onNavigate('client-detail', { clientId })}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nouvelle intervention d'entretien</h1>
            <p className="text-gray-600 mt-1">Client : {client.nom} - {client.nomFerme}</p>
          </div>
        </div>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <p className="text-gray-700">
            <strong>Sélectionnez les machines à entretenir :</strong>
            <br />
            <small className="text-gray-600">(Cliquez sur une machine pour choisir les sections)</small>
          </p>
        </Card>

        {/* Liste des machines */}
        <div className="space-y-4">
          {clientMachines.map((machine) => {
            const isSelected = isMachineSelected(machine._id);
            const config = selectedMachines.find(m => m.machineId === machine._id);

            return (
              <Card 
                key={machine._id}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'border-green-500 bg-green-50' : 'hover:border-blue-300'
                }`}
                onClick={() => !isSelected && openMachineModal(machine)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{machine.nom}</h3>
                    <p className="text-sm text-gray-600">N° série : {machine.numeroSerie}</p>
                    {config && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-green-700 font-medium">
                          Kit : {config.kitNom}
                        </p>
                        <p className="text-sm text-gray-600">
                          Sections : {config.sections.map(s => s.nom).join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {config.sections.reduce((sum, s) => sum + s.tasksCount, 0)} tâches
                        </p>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMachineModal(machine, true);
                        }}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMachine(machine._id);
                        }}
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                      <Check size={24} className="text-green-600" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Résumé et actions */}
        {selectedMachines.length > 0 && (
          <>
            <Card className="bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Résumé de l'intervention</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{totals.totalMachines}</p>
                  <p className="text-sm text-gray-600">Machines</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{totals.totalSections}</p>
                  <p className="text-sm text-gray-600">Sections</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{totals.totalTasks}</p>
                  <p className="text-sm text-gray-600">Tâches</p>
                </div>
              </div>
            </Card>

            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => onNavigate('client-detail', { clientId })}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateIntervention}
                disabled={loading}
                size="lg"
              >
                {loading ? 'Création...' : 'Créer l\'intervention'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Modal de sélection */}
      {modalVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditingMachine ? 'Modifier' : 'Configurer'} : {currentMachine?.nom}
                </h2>
                <Button variant="ghost" size="sm" onClick={closeModal}>
                  <X size={20} />
                </Button>
              </div>

              {/* Sélection du kit */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kit d'entretien
                </label>
                <select
                  value={selectedKit}
                  onChange={(e) => handleKitChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  {availableKits.map((kit) => (
                    <option key={kit.kitId} value={kit.kitId}>
                      {kit.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sélection des sections */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sections à réaliser ({selectedSections.length} sélectionnées)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {availableSections.map((section) => (
                    <label
                      key={section.nom}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(section.nom)}
                        onChange={() => toggleSection(section.nom)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className="font-medium">{section.nom}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({section.count} tâches)
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Total des tâches sélectionnées */}
              {selectedSections.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Total :</strong> {modalTotalTasks} tâches à réaliser
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={closeModal}>
                  Annuler
                </Button>
                <Button onClick={addOrUpdateMachine}>
                  {isEditingMachine ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
