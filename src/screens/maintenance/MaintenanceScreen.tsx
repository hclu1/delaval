//MaintenanceScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {CheckCircle2, Circle, ArrowLeft, Save} from 'lucide-react';
import { useMaintenanceKits } from '../../hooks/useMaintenanceKits';
import { useMachines } from '../../hooks/useMachines';
import { useVisibilityRefresh } from '../../hooks/useVisibilityRefresh';

interface MaintenanceScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  machineId: string;
  kitId?: string;
  sectionId?: string;
}

export function MaintenanceScreen({ onNavigate, machineId, kitId, sectionId }: MaintenanceScreenProps) {
  const { maintenanceKits, fetchMaintenanceKits } = useMaintenanceKits();
  const { machines, fetchMachines, updateMachine, getMachineById } = useMachines();

  const [machine, setMachine] = useState<any>(null);
  const [currentKit, setCurrentKit] = useState<any>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const loadDataV2 = async () => {
    try {
      if (machineId) {
        const fetchedMachine = await getMachineById(machineId);
        setMachine(fetchedMachine);
      } else {
        setMachine(null);
      }
      await fetchMaintenanceKits({ limit: 100 });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDataLoaded(true);
    }
  };

  useEffect(() => {
    loadDataV2();
  }, [machineId]);
  // Rafraîchissement automatique au retour sur l'app (smartphone)
  useVisibilityRefresh(loadDataV2);

  useEffect(() => {
    console.log("🛠️ MaintenanceScreen - maintenanceKits:", maintenanceKits);
    console.log("🛠️ MaintenanceScreen - machine:", machine);

    if (maintenanceKits.length > 0 && machine) {
      // Trouver le kit spécifique ou le premier kit de la machine
      let kit;
      if (kitId) {
        kit = maintenanceKits.find(k => k._id === kitId || k.id === kitId || k.kitId === kitId);
      } else {
        const machineModel = machine.machineType || machine.typeMachineNom || machine.modele;
        console.log("🛠️ MaintenanceScreen - machineModel détecté:", machineModel);

        const machineKits = maintenanceKits
          .filter(k => {
            if (!k.machineType || !machineModel) return false;
            
            const kt = k.machineType.toLowerCase();
            const md = machineModel.toLowerCase();
            const isMatch = kt.includes(md) || md.includes(kt) || kt === 'tous' || md === 'tous';
            
            console.log(`🛠️ Comparaison: Kit "${k.machineType}" vs Machine "${machineModel}" => Match? ${isMatch}`);
            return isMatch;
          })
          .sort((a, b) => (a.serviceNumber || a.ordre || 0) - (b.serviceNumber || b.ordre || 0));
        
        console.log("🛠️ MaintenanceScreen - kits correspondants:", machineKits);
        kit = machineKits[0];
      }
      console.log("🛠️ MaintenanceScreen - kit sélectionné:", kit);
      setCurrentKit(kit);
    }
  }, [maintenanceKits, machineId, kitId, machine]);
 // Charger les tâches de la section sélectionnée
useEffect(() => {
  if (sectionId && currentKit) {
    const section = currentKit.sections?.find(
      (s: any) => s._id === sectionId || s.nom === sectionId
    );
    setTasks(section?.taches || []);
    setTasksLoaded(true);
  }
}, [sectionId, currentKit]); 

  const toggleSection = (sectionId: string) => {
    setCompletedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleTaskToggle = (taskId: string) => {
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleComplete = async () => {
    if (!currentKit || !machine) return;

    const totalSections = currentKit.sections?.length || 0;
    if (completedSections.size < totalSections) {
      if (!confirm('Certaines sections ne sont pas complétées. Voulez-vous quand même terminer ?')) {
        return;
      }
    }

    setLoading(true);
    try {
      // Mettre à jour la date du dernier entretien
await updateMachine(machineId, {
  dateDernierEntretien: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notesEntretien: notes
});
      alert('Entretien terminé avec succès !');
      onNavigate('machine-detail', { machineId });
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la validation de l\'entretien');
    } finally {
      setLoading(false);
    }
  };

  // Si on affiche une section spécifique
  if (sectionId && kitId) {
    return (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Button 
              variant="ghost" 
              onClick={() => onNavigate('maintenance', { machineId, kitId })}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Section: {sectionId}</h1>
              <p className="text-gray-600 mt-1">Validez les tâches individuellement</p>
            </div>
          </div>

          {/* Liste des tâches */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tâches à effectuer</h2>
            
            {!tasksLoaded ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Chargement des tâches...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune tâche trouvée pour cette section</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isCompleted = completedTasks.has(task._id);
                  return (
                    <div 
                      key={task._id}
                      className={`p-4 rounded-lg transition-colors ${
                        isCompleted ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => handleTaskToggle(task._id)}
                          className="w-5 h-5 mt-1 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                          {task.idTache}
                        </span>
                        <div className="flex-1">
                          <h3 className={`font-medium mb-1 ${isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                            {task.description}
                          </h3>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                            {task.module && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Module:</span> {task.module}
                              </span>
                            )}
                            {task.etat && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">État:</span> {task.etat}
                              </span>
                            )}
                            {task.refPiece && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Réf:</span> {task.refPiece}
                              </span>
                            )}
                            {task.quantite && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Qté:</span> {task.quantite}
                              </span>
                            )}
                          </div>
                          {isCompleted && (
                            <div className="mt-2 text-sm text-green-600 font-medium">
                              ✓ Tâche complétée
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
    );
  }

  if (!machine || !currentKit) {
    if (isDataLoaded) {
      const machineModel = machine ? (machine.machineType || machine.typeMachineNom || machine.modele) : null;
      return (
        <Card className="text-center py-12">
          <p className="text-red-500 mb-4 text-lg">
            {!machine 
              ? "Machine introuvable." 
              : `Aucun kit d'entretien configuré pour ce modèle (${machineModel || 'Inconnu'}).`}
          </p>
          <Button onClick={() => onNavigate('machine-detail', { machineId })}>
            Retour à la machine
          </Button>
        </Card>
      );
    }
    return (
        <Card className="text-center py-12">
          <p className="text-gray-500">Chargement de l'entretien...</p>
        </Card>
    );
  }

  const progress = currentKit.sections?.length 
    ? (completedSections.size / currentKit.sections.length) * 100 
    : 0;

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            onClick={() => onNavigate('machine-detail', { machineId })}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Entretien en cours</h1>
            <p className="text-gray-600 mt-1">{machine.nom} - {currentKit.nom}</p>
          </div>
        </div>

        {/* Barre de progression */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-900">Progression</span>
            <span className="text-lg font-bold text-blue-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {completedSections.size} sur {currentKit.sections?.length || 0} sections complétées
          </div>
        </Card>

        {/* Informations du kit */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{currentKit.nom}</h2>
          {currentKit.description && (
            <p className="text-gray-600 mb-4">{currentKit.description}</p>
          )}
          {currentKit.ordre && (
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              Kit d'entretien #{currentKit.ordre}
            </span>
          )}
        </Card>

        {/* Sections d'entretien */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tâches à effectuer</h2>
          
          {!currentKit.sections || currentKit.sections.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune section définie pour ce kit</p>
          ) : (
            <div className="space-y-3">
              {currentKit.sections.map((section: any, index: number) => {
                const isCompleted = completedSections.has(section._id || `section-${index}`);
                return (
                  <button
                    key={section._id || index}
                    onClick={() => toggleSection(section._id || `section-${index}`)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      isCompleted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {isCompleted ? (
                          <CheckCircle2 className="text-green-600" size={24} />
                        ) : (
                          <Circle className="text-gray-400" size={24} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold mb-1 ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                          {section.titre || section.nom || `Section ${index + 1}`}
                        </h3>
                        {section.description && (
                          <p className={`text-sm ${isCompleted ? 'text-green-700' : 'text-gray-600'}`}>
                            {section.description}
                          </p>
                        )}
                        {section.instructions && (
                          <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            {section.instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Notes */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Notes et observations</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajoutez vos remarques, observations ou anomalies constatées..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={6}
          />
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={() => onNavigate('machine-detail', { machineId })}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleComplete}
            disabled={loading}
            className="flex items-center gap-2"
>
            <Save size={20} />
            {loading ? 'Enregistrement...' : 'Terminer l\'entretien'}
          </Button>
        </div>
      </div>
  );
}
