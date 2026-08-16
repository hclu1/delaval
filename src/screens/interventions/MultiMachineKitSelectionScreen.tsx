//MultiMachineKitSelectionScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ArrowLeft, Wrench, CheckCircle } from 'lucide-react';
import { useMachines } from '../../hooks/useMachines';
import { useMaintenanceKits } from '../../hooks/useMaintenanceKits';

interface Props {
  onNavigate: (screen: string, params?: any) => void;
  clientId: string;
  machineIds: string[];
}

interface MachineKitSelection {
  machineId: string;
  kitId: string | null;
}

export function MultiMachineKitSelectionScreen({ onNavigate, clientId, machineIds }: Props) {
  const { getMachineById } = useMachines();
  const { getKitsByMachineModels, loading: kitsLoading } = useMaintenanceKits();
  
  const [selectedMachines, setSelectedMachines] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filteredKits, setFilteredKits] = useState<any[]>([]);

  useEffect(() => {
    console.log('🔄 [RESET] Réinitialisation complète de l\'écran');
    setSelections({});
    setSelectedMachines([]);
    setFilteredKits([]);
    setIsLoading(true);
  }, []);

  useEffect(() => {
    const loadMachines = async () => {
      console.log('🔍 Chargement des machines:', machineIds);
      setIsLoading(true);
      const machinesData = await Promise.all(machineIds.map(id => getMachineById(id)));
      const validMachines = machinesData.filter(Boolean);
      
      if (validMachines.length > 0) {
        console.log('📦 STRUCTURE MACHINE:', JSON.stringify(validMachines[0], null, 2));
      }
      
      setSelectedMachines(validMachines);
      console.log('✅ Machines chargées:', validMachines.length);
      setIsLoading(false);
    };
    loadMachines();
  }, [machineIds, getMachineById]);

  useEffect(() => {
    const loadCompatibleKits = async () => {
      if (selectedMachines.length === 0) {
        console.log('⏳ En attente du chargement des machines...');
        return;
      }

      // Lecture directe du champ machineType — pas de regex
      const machineModels = [...new Set(
        selectedMachines
          .map(m => (m.machineType || m.model || m.modele || m.type || m.nom || '').trim())
          .filter(model => model !== '')
      )];

      if (machineModels.length === 0) {
        setFilteredKits([]);
        return;
      }

      const kits = await getKitsByMachineModels(machineModels);
      
      setFilteredKits(kits);
    };

    loadCompatibleKits();
  }, [selectedMachines, getKitsByMachineModels]);

  const handleKitChange = (machineId: string, kitId: string) => {
    console.log('🔄 Sélection kit:', { machineId, kitId });
    setSelections(prev => ({ ...prev, [machineId]: kitId }));
  };

  useEffect(() => {
    const autoSelectKits = async () => {
      if (selectedMachines.length === 0 || filteredKits.length === 0) return;
      
      try {
        const { api } = await import('../../lib/api');
        const data = await api.entities.interventions.list({ clientId });
        const allInterventions = data.list || [];
        
        const newSelections: Record<string, string> = {};
        
        selectedMachines.forEach(machine => {
          // 1. Get kits for this machine
          let machineType = machine.model || machine.machineType || machine.modele || machine.type;
          if (!machineType && machine.nom) {
            const match = machine.nom.match(/^(VMS\s*[\/]?\s*\d*|V\s*\d+)/i);
            if (match) machineType = match[0].replace(/\s+/g, ' ').trim();
            else machineType = machine.nom.split('-')[0]?.trim();
            if (machineType.includes('/')) machineType = machineType.split('/')[0].trim();
          }
          const kitsForMachine = getKitsForMachine(machineType);
          
          if (kitsForMachine.length === 0) {
            newSelections[machine._id] = 'no-kit';
            return;
          }

          if (kitsForMachine.length === 1) {
            newSelections[machine._id] = kitsForMachine[0]._id;
            return;
          }
          
          // 2. Find last maintenance intervention for this machine
          const machineInterventions = allInterventions
            .filter((i: any) => i.type === 'MAINTENANCE' && i.machineIds && i.machineIds.includes(machine._id))
            .sort((a: any, b: any) => new Date(b.createdAt || b.dateDebut).getTime() - new Date(a.createdAt || a.dateDebut).getTime());
            
          let lastKitId = null;
          if (machineInterventions.length > 0) {
            const lastIntervention = machineInterventions[0];
            const machineData = lastIntervention.machines?.find((m: any) => m.machineId === machine._id);
            if (machineData && machineData.kitId) {
              lastKitId = machineData.kitId;
            }
          }
          
          if (lastKitId) {
            const lastKit = filteredKits.find(k => k._id === lastKitId || k.kitId === lastKitId);
            if (lastKit && typeof lastKit.serviceNumber === 'number') {
              const nextServiceNumber = lastKit.serviceNumber + 1;
              const nextKit = kitsForMachine.find(k => k.serviceNumber === nextServiceNumber);
              if (nextKit) {
                newSelections[machine._id] = nextKit._id;
                return;
              }
            }
          }
          
          // Fallback: select kit with lowest service number (usually 1)
          const sortedKits = [...kitsForMachine].sort((a, b) => (a.serviceNumber || 1) - (b.serviceNumber || 1));
          newSelections[machine._id] = sortedKits[0]._id;
        });
        
        setSelections(prev => ({ ...prev, ...newSelections }));
      } catch (err) {
        console.error('Erreur auto-sélection kits:', err);
      }
    };
    
    // Run auto-selection only if selections are empty
    if (Object.keys(selections).length === 0 && selectedMachines.length > 0 && filteredKits.length > 0) {
      autoSelectKits();
    }
  }, [filteredKits, selectedMachines, clientId, selections]);

  const getKitsForMachine = (machineType: string) => {
    console.log('🔍 [getKitsForMachine] Recherche kits pour:', machineType);
    
    // Si pas de type, on ne retourne rien
    if (!machineType) {
      return [];
    }

    // 1. On nettoie : on enlève les espaces et on met en minuscule
    // "V 300" devient "v300"
    const needle = machineType.toLowerCase().replace(/\s+/g, '').trim();

    // 2. LA CORRECTION IMPORTANTE :
    // Si le type détecté est trop court (ex: juste "V"), on force une correspondance EXACTE.
    // Cela empêche "V" de matcher avec "V300" ou "VMS".
    if (needle.length < 2) {
      console.warn('⚠️ Nom trop court, on cherche une correspondance exacte :', needle);
      return filteredKits.filter(kit => {
        if (!kit.machineType) return false;
        const hay = kit.machineType.toLowerCase().replace(/\s+/g, '').trim();
        return hay === needle;
      });
    }

    // 3. Pour les noms normaux (plus longs), on cherche des correspondances
    return filteredKits.filter(kit => {
      if (!kit.machineType) return false;
      
      // Séparer les types de machine du kit par virgules ou slashs
      const kitTypes = kit.machineType.split(/[,/]/).map((t: string) => t.toLowerCase().replace(/\s+/g, '').trim());

      // Vérifier si la machine sélectionnée (needle) correspond à un des types du kit
      return kitTypes.some((kt: string) => {
        if (needle === 'vms' && (kt.includes('v300') || kt.includes('v310'))) return false;
        if (kt === 'vms' && (needle.includes('v300') || needle.includes('v310'))) return false;
        
        if (needle === kt) return true;
        if (kt.includes(needle)) return true;
        if (needle.includes(kt)) return true;
        return false;
      });
    });
  };

  const handleConfirm = () => {
    if (Object.keys(selections).length !== machineIds.length) {
      alert('⚠️ Veuillez sélectionner un kit pour chaque machine.');
      return;
    }

const machineKitSelections: MachineKitSelection[] = Object.entries(selections).map(
  ([machineId, kitId]) => ({ machineId, kitId: kitId === 'no-kit' ? null : kitId })
);
    console.log('✅ Sélections validées:', machineKitSelections);

    onNavigate('multi-machine-section-selection', {
      clientId,
      machineKitSelections
    });
  };

  if (isLoading || kitsLoading) {
    return (
      <Card className="text-center py-12">
        <p>⏳ Chargement des machines et kits...</p>
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
          <ArrowLeft size={20} /> Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sélection des Kits d'Entretien</h1>
          <p className="text-gray-600 mt-1">Choisissez un kit pour chaque machine sélectionnée.</p>
        </div>
      </div>

      {filteredKits.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-800">
            🔍 <strong>{filteredKits.length}</strong> kits disponibles pour les modèles : 
            <strong> {[...new Set(
              selectedMachines
                .map(m => m.model || m.machineType || m.modele || m.type || m.nom?.match(/^(VMS\s*\d+|V\s*\d+)/i)?.[0])
                .filter(Boolean)
            )].join(', ')}</strong>
          </p>
        </div>
      )}

      {selectedMachines.map(machine => {
        let machineType = machine.model || machine.machineType || machine.modele || machine.type;
        
        if (!machineType && machine.nom) {
          // 1. Regex améliorée pour accepter "VMS", "VMS/1" ou "VMS 2014"
          const match = machine.nom.match(/^(VMS\s*[\/]?\s*\d*|V\s*\d+)/i);
          
          if (match) {
            machineType = match[0].replace(/\s+/g, ' ').trim();
          } else {
            // Si pas de match, on prend le début du nom (avant le tiret)
            machineType = machine.nom.split('-')[0]?.trim();
          }

          // 2. ✅ CORRECTION IMPORTANTE : Si on a "VMS/1", on coupe pour ne garder que "VMS"
          if (machineType.includes('/')) {
            machineType = machineType.split('/')[0].trim();
          }
        }
        
        console.log('🎯 Affichage machine:', machine.nom, '→ Type utilisé:', machineType);
        
        const kitsForThisMachine = getKitsForMachine(machineType);
        
        return (
          <Card key={machine._id}>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench size={20} />
              {machine.nom} - {machine.numeroSerie}
              <span className="text-sm font-normal text-gray-500">
                (Type: {machineType || 'Non défini'})
              </span>
            </h2>
            
            {kitsForThisMachine.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-2">
                  ✅ {kitsForThisMachine.length} kit(s) disponible(s) :
                </p>
                {kitsForThisMachine.map(kit => (
                  <label 
                    key={kit._id} 
                    className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition"
                  >
                    <input
                      type="radio"
                      name={`kit-${machine._id}`}
                      value={kit._id}
                      checked={selections[machine._id] === kit._id}
                      onChange={() => handleKitChange(machine._id, kit._id)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{kit.nom}</div>
                      <div className="text-sm text-gray-600">
                        {kit.machineType} - Service {kit.serviceNumber}
                      </div>
                    </div>
                    {selections[machine._id] === kit._id && (
                      <CheckCircle className="text-green-500" size={20} />
                    )}
                  </label>
                ))}
              </div>
           ) : (
  <div className="space-y-3">
    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
      <p className="text-yellow-800 text-sm">
        ⚠️ Aucun kit trouvé pour ce type de machine.
      </p>
    </div>
    <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition">
      <input
        type="radio"
        name={`kit-${machine._id}`}
        value="no-kit"
        checked={selections[machine._id] === 'no-kit'}
        onChange={() => handleKitChange(machine._id, 'no-kit')}
        className="mr-3"
      />
      <div className="flex-1">
        <div className="font-medium">Entretien sans kit</div>
        <div className="text-sm text-gray-500">Entretien libre, sans référence de kit</div>
      </div>
      {selections[machine._id] === 'no-kit' && (
        <CheckCircle className="text-green-500" size={20} />
      )}
    </label>
  </div>
)}
          </Card>
        );
      })}

      <div className="flex justify-end pt-4 border-t">
        <Button 
          onClick={handleConfirm} 
          disabled={Object.keys(selections).length !== machineIds.length}
        >
          Valider la sélection ({Object.keys(selections).length}/{machineIds.length})
        </Button>
      </div>
    </div>
  );
}
