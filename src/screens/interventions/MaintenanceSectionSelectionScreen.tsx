//MaintenanceSectionSelectionScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {ArrowLeft, ChevronDown, ChevronRight} from 'lucide-react';
import { useMaintenanceKits } from '../../hooks/useMaintenanceKits';
import { useTachesEntretien } from '../../hooks/useTachesEntretien';

interface MaintenanceSectionSelectionScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  machines: any[];
  clientId: string;
  onConfirm: (selectionData: any) => void;
}

export function MaintenanceSectionSelectionScreen({ 
  onNavigate, 
  machines, 
  clientId,
  onConfirm 
}: MaintenanceSectionSelectionScreenProps) {
  const { getKitsByMachineType } = useMaintenanceKits();
  const { getSectionsByKit } = useTachesEntretien();

  const [machineConfigs, setMachineConfigs] = useState<Record<string, any>>({});
  const [expandedMachines, setExpandedMachines] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMachineKits();
  }, [machines]);

  const loadMachineKits = async () => {
    setLoading(true);
    const configs: Record<string, any> = {};
    
    for (const machine of machines) {
      const kits = await getKitsByMachineType(machine.typeRelation || 'V300');
      const sections = kits.length > 0 ? await getSectionsByKit(kits[0].kitId) : [];
      
      console.log('🔧 Machine:', machine.nom);
      console.log('📦 Kits trouvés:', kits);
      console.log('📋 Sections du premier kit:', sections);
      
      configs[machine._id] = {
        machine,
        availableKits: kits,
        selectedKit: kits[0] || null,
        sections: sections,
        selectedSections: []
      };
      
      setExpandedMachines(prev => ({ ...prev, [machine._id]: true }));
    }
    
    setMachineConfigs(configs);
    setLoading(false);
  };

  const handleKitChange = async (machineId: string, kitId: string) => {
    const kit = machineConfigs[machineId].availableKits.find((k: any) => k.kitId === kitId);
    const sections = await getSectionsByKit(kitId);
    
    console.log('🔄 Changement de kit pour machine:', machineId);
    console.log('📦 Nouveau kit:', kit);
    console.log('📋 Nouvelles sections:', sections);
    
    setMachineConfigs(prev => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        selectedKit: kit,
        sections,
        selectedSections: []
      }
    }));
  };

  const toggleSection = (machineId: string, sectionName: string) => {
    setMachineConfigs(prev => {
      const current = prev[machineId].selectedSections;
      const isSelected = current.includes(sectionName);
      
      return {
        ...prev,
        [machineId]: {
          ...prev[machineId],
          selectedSections: isSelected
            ? current.filter((s: string) => s !== sectionName)
            : [...current, sectionName]
        }
      };
    });
  };

  const toggleMachineExpanded = (machineId: string) => {
    setExpandedMachines(prev => ({ ...prev, [machineId]: !prev[machineId] }));
  };

  const calculateTotals = () => {
    let totalSections = 0;
    let totalTasks = 0;

    Object.values(machineConfigs).forEach((config: any) => {
      totalSections += config.selectedSections.length;
      config.selectedSections.forEach((sectionName: string) => {
        const section = config.sections.find((s: any) => s.nom === sectionName);
        if (section) totalTasks += section.count;
      });
    });

    return { totalSections, totalTasks };
  };

  const handleConfirm = () => {
    const hasSelections = Object.values(machineConfigs).some(
      (config: any) => config.selectedSections.length > 0
    );

    if (!hasSelections) {
      alert('Veuillez sélectionner au moins une section pour une machine');
      return;
    }

    const selectionData = Object.values(machineConfigs).map((config: any) => ({
      machineId: config.machine._id,
      machineNom: config.machine.nom,
      kitId: config.selectedKit?.kitId,
      kitNom: config.selectedKit?.nom,
      selectedSections: config.selectedSections.map((sectionName: string) => {
        const section = config.sections.find((s: any) => s.nom === sectionName);
        
        console.log('📋 Section sélectionnée:', sectionName);
        console.log('📋 Section complète:', section);
        console.log('📋 Tâches de la section:', section?.taches);
        
        return {
          sectionNom: sectionName,
          taches: section?.taches || [], // ✅ Envoyer les tâches complètes
          tachesIds: section?.taches?.map((t: any) => t.idTache) || [],
          tachesCount: section?.count || section?.taches?.length || 0
        };
      })
    }));

    console.log('✅ Données de sélection complètes:', JSON.stringify(selectionData, null, 2));
    onConfirm(selectionData);
  };

  const totals = calculateTotals();

  if (loading) {
    return (
        <Card className="text-center py-12">
          <p className="text-gray-500">Chargement des kits d'entretien...</p>
        </Card>
    );
  }

  return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => onNavigate('intervention-form', { clientId })}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sélection des sections d'entretien</h1>
            <p className="text-gray-600 mt-1">Choisissez les sections à entretenir pour chaque machine</p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.values(machineConfigs).map((config: any, index: number) => {
            const isExpanded = expandedMachines[config.machine._id];
            const selectedCount = config.selectedSections.length;
            const totalTasksForMachine = config.selectedSections.reduce((sum: number, sectionName: string) => {
              const section = config.sections.find((s: any) => s.nom === sectionName);
              return sum + (section?.count || 0);
            }, 0);

            return (
              <Card key={config.machine._id} className="overflow-hidden">
                <div 
                  className="flex items-center justify-between cursor-pointer p-4 hover:bg-gray-50 transition-colors"
                  onClick={() => toggleMachineExpanded(config.machine._id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <div>
                      <h3 className="font-bold text-lg">
                        Machine {index + 1} : {config.machine.nom}
                      </h3>
                      {selectedCount > 0 && (
                        <p className="text-sm text-blue-600">
                          {selectedCount} section(s) sélectionnée(s) ({totalTasksForMachine} tâches)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 pt-0 space-y-4">
                    {config.availableKits.length === 0 ? (
                      <p className="text-gray-500 italic">Aucun kit disponible pour ce type de machine</p>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Kit d'entretien
                          </label>
                          <select
                            value={config.selectedKit?.kitId || ''}
                            onChange={(e) => handleKitChange(config.machine._id, e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {config.availableKits.map((kit: any) => (
                              <option key={kit.kitId} value={kit.kitId}>
                                {kit.nom}
                              </option>
                            ))}
                          </select>
                        </div>

                        {config.sections.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Sections du kit (cocher pour sélectionner)
                            </label>
                            <div className="space-y-2">
                              {config.sections.map((section: any) => (
                                <label
                                  key={section.nom}
                                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                    config.selectedSections.includes(section.nom)
                                      ? 'border-blue-600 bg-blue-50'
                                      : 'border-gray-200 hover:border-blue-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={config.selectedSections.includes(section.nom)}
                                    onChange={() => toggleSection(config.machine._id, section.nom)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{section.nom}</div>
                                    <div className="text-sm text-gray-600">
                                      {section.count} tâche(s)
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Récapitulatif</h3>
              <p className="text-gray-700 mt-1">
                Total : {totals.totalSections} section(s), {totals.totalTasks} tâche(s)
              </p>
            </div>
          </div>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={() => onNavigate('intervention-form', { clientId })}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={totals.totalSections === 0}
          >
            Créer l'intervention
          </Button>
        </div>
      </div>
  );
}