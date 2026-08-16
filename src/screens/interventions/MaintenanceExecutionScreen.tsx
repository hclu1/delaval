//MaintenanceExecutionScreen.tsx
//MaintenanceExecutionScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {ArrowLeft, ChevronDown, ChevronRight, Pause, CheckCircle} from 'lucide-react';
import { useInterventions } from '../../hooks/useInterventions';
import { useTachesEntretien } from '../../hooks/useTachesEntretien';
import { api } from '../../lib/api';

interface MaintenanceExecutionScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  interventionId: string;
  interventionData?: any;
  readOnly?: boolean; // ✅ Ajoutez ce paramètre
}

interface TaskDetails {
  idTache: string;
  section: string;
  description: string;
  module?: string;
  etat?: string;
  refPiece?: string;
  quantite?: number;
}

export function MaintenanceExecutionScreen({ 
  onNavigate, 
  interventionId,
  interventionData,
  readOnly
}: MaintenanceExecutionScreenProps) {

  const { updateIntervention } = useInterventions();
  const { fetchTachesByKit } = useTachesEntretien();
  const [intervention, setIntervention] = useState<any>(null);
  const [expandedMachines, setExpandedMachines] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [taskDetails, setTaskDetails] = useState<Record<string, TaskDetails>>({});
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  
  const canValidateSections = true;

  // ✅ Fonction pour charger les détails des tâches
  const loadTaskDetailsFromData = async (data: any) => {
    const details: Record<string, TaskDetails> = {};
    
    if (data.machines && data.machines.length > 0) {
      for (const machine of data.machines) {
        if (machine.kitId) {
          const tasks = await fetchTachesByKit(machine.kitId);
          tasks.forEach((task: any) => {
            details[task.idTache] = {
              idTache: task.idTache,
              section: task.section,
              description: task.description || `Tâche ${task.idTache}`,
              module: task.module,
              etat: task.etat,
              refPiece: task.refPiece,
              quantite: task.quantite
            };
          });
        }
      }
    }
    
    setTaskDetails(details);
    console.log('✅ Détails des tâches chargés:', Object.keys(details).length, 'tâches');
  };

  // ✅ Fonction pour charger depuis Lumi
// ✅ Fonction unique pour charger l'intervention
const loadInterventionFromDB = async (id: string, retryCount = 0) => {
  console.log('🔍 [MAINTENANCE] Chargement intervention:', id, '(Tentative', retryCount + 1, ')');
  
  try {
    const result = await api.entities.interventions.get(id);
    
    // ✅ LOGS DE DEBUG - À AJOUTER ICI
    console.log('📦 [DEBUG] Intervention brute:', result);
    console.log('📦 [DEBUG] result.machines:', result?.machines);
    console.log('📦 [DEBUG] result.machineIds:', result?.machineIds);
    console.log('📦 [DEBUG] result.totalTaches:', result?.totalTaches);
    console.log('📦 [DEBUG] result.tachesCompletees:', result?.tachesCompletees);
    console.log('📦 [DEBUG] Type de result.machines:', typeof result?.machines);
    console.log('📦 [DEBUG] Est un tableau?', Array.isArray(result?.machines));
    
    if (!result) {
      console.error('❌ Intervention non trouvée:', id);
      alert('Intervention introuvable');
      onNavigate('interventions');
      return;
    }
    
    console.log('✅ Intervention chargée:', {
      id: result._id,
      type: result.type,
      statut: result.statut,
      machines: result.machines?.length || 0,
      tachesCompletees: result.tachesCompleteesCount || 0
    });
    
    setIntervention(result);
    
    // ... GARDEZ tout le reste du code après

    
    // Charger les détails des tâches
    const details: Record<string, TaskDetails> = {};
    if (result.machines && result.machines.length > 0) {
      for (const machine of result.machines) {
        if (machine.kitId) {
          const tasks = await fetchTachesByKit(machine.kitId);
          tasks.forEach((task: any) => {
            details[task.idTache] = {
              idTache: task.idTache,
              section: task.section,
              description: task.description || `Tâche ${task.idTache}`,
              module: task.module,
              etat: task.etat,
              refPiece: task.refPiece,
              quantite: task.quantite
            };
          });
        }
      }
    }
    setTaskDetails(details);
    console.log('✅ Détails tâches chargés:', Object.keys(details).length);
    
    // Auto-expand machines
    if (result.machines && result.machines.length > 0) {
      const expandedMachines: Record<string, boolean> = {};
      const expandedSections: Record<string, boolean> = {};
      
      result.machines.forEach((m: any) => {
        expandedMachines[m.machineId] = true; // Toutes ouvertes
        if (m.sections) {
          m.sections.forEach((s: any) => {
            expandedSections[`${m.machineId}_${s.sectionNom}`] = false;
          });
        }
      });
      
      setExpandedMachines(expandedMachines);
      setExpandedSections(expandedSections);
    }
    
    // Restaurer tâches complétées
    if (result.tachesCompletees && Array.isArray(result.tachesCompletees) && result.tachesCompletees.length > 0) {
      console.log('📝 Restauration de', result.tachesCompletees.length, 'tâches complétées');
      const completed: Record<string, boolean> = {};
      const notes: Record<string, string> = {};
      
      result.tachesCompletees.forEach((tc: any) => {
        const key = `${tc.machineId}_${tc.idTache}`;
        completed[key] = true;
        if (tc.note) {
          notes[key] = tc.note;
        }
      });
      
      setCompletedTasks(completed);
      setTaskNotes(notes);
    } else {
      setCompletedTasks({});
      setTaskNotes({});
    }
    
  } catch (error) {
    console.error('❌ Erreur chargement:', error);
    
    // Retry si nécessaire
    if (retryCount < 3) {
      console.log('🔄 Nouvelle tentative dans 1s...');
      setTimeout(() => {
        loadInterventionFromDB(id, retryCount + 1);
      }, 1000);
    } else {
      alert('❌ Erreur lors du chargement après plusieurs tentatives.');
      onNavigate('interventions');
    }
  }
};

// ✅ useEffect simplifié
useEffect(() => {
  console.log('🔄 [MAINTENANCE] Écran monté');
  console.log('📥 interventionId:', interventionId);
  console.log('📥 interventionData:', interventionData);
  console.log('📥 readOnly:', readOnly);
  
  if (!interventionId) {
    console.error('❌ Aucun interventionId fourni');
    onNavigate('interventions');
    return;
  }
  
  // ✅ Toujours charger depuis la DB pour avoir les données à jour
  console.log('📂 Chargement depuis Lumi');
  loadInterventionFromDB(interventionId);
}, [interventionId]);

// Polling toutes les 30s pour synchroniser avec les autres techniciens
useEffect(() => {
  if (!interventionId) return;

  const poll = setInterval(async () => {
    try {
      const result = await api.entities.interventions.get(interventionId);
      if (!result) return;

      // Mettre a jour l'intervention (machines, statut, progression)
      setIntervention(result);

      // Fusionner les taches completees : union des deux sets
      // On garde ce que le technicien local a fait ET ce que les autres ont fait
      if (result.tachesCompletees && Array.isArray(result.tachesCompletees)) {
        const merged: Record<string, boolean> = {};
        const mergedNotes: Record<string, string> = {};

        result.tachesCompletees.forEach((tc: any) => {
          const key = `${tc.machineId}_${tc.idTache}`;
          merged[key] = true;
          if (tc.note) mergedNotes[key] = tc.note;
        });

        // Conserver aussi les taches cochees localement (pas encore sauvegardees)
        setCompletedTasks(prev => ({ ...merged, ...prev }));
        setTaskNotes(prev => ({ ...mergedNotes, ...prev }));
      }

    } catch (err) {
      // Silencieux : pas d'alerte si le poll echoue (reseau momentanement indisponible)
      console.warn('[POLL] Erreur synchronisation:', err);
    }
  }, 30_000); // toutes les 30 secondes

  return () => clearInterval(poll);
}, [interventionId]);


  // ... GARDEZ tout le reste du code (toggleTaskCompletion, handleSaveAndReturn, etc.)



  // ✅ CORRECTION : Utilisation de .get() au lieu de .list() pour être robuste
  const loadIntervention = async (retryCount = 0) => {
    console.log('🔍 Début chargement intervention depuis la base:', interventionId, '(Tentative', retryCount + 1, ')');
    try {
      // On utilise directement l'ID, comme pour InterventionDetailScreen
      const result = await api.entities.interventions.get(interventionId);
      
      console.log('📦 Résultat brut de la base:', result);
      
      if (result) {
        // result est l'objet direct, pas une liste
        const inter = result; 
        console.log('✅ Intervention chargée:', {
          id: inter._id,
          statut: inter.statut,
          tachesCompletees: inter.tachesCompletees,
          tachesCompleteesCount: inter.tachesCompleteesCount
        });
        
        setIntervention(inter);
        
        const details: Record<string, TaskDetails> = {};
        if (inter.machines && inter.machines.length > 0) {
          for (const machine of inter.machines) {
            if (machine.kitId) {
              const tasks = await fetchTachesByKit(machine.kitId);
              tasks.forEach((task: any) => {
                details[task.idTache] = {
                  idTache: task.idTache,
                  section: task.section,
                  description: task.description || `Tâche ${task.idTache}`,
                  module: task.module,
                  etat: task.etat,
                  refPiece: task.refPiece,
                  quantite: task.quantite
                };
              });
            }
          }
        }
        setTaskDetails(details);
        
        if (inter.machines && inter.machines.length > 0) {
          const expandedMachines: Record<string, boolean> = {};
          const expandedSections: Record<string, boolean> = {};
          inter.machines.forEach((m: any) => {
            expandedMachines[m.machineId] = true;
            if (m.sections && m.sections.length > 0) {
              m.sections.forEach((s: any) => {
                expandedSections[`${m.machineId}_${s.sectionNom}`] = false;
              });
            }
          });
          setExpandedMachines(expandedMachines);
          setExpandedSections(expandedSections);
        }
        
        if (inter.tachesCompletees && Array.isArray(inter.tachesCompletees) && inter.tachesCompletees.length > 0) {
          console.log('✅ Chargement de', inter.tachesCompletees.length, 'tâches complétées depuis la base');
          const completed: Record<string, boolean> = {};
          const notes: Record<string, string> = {};
          inter.tachesCompletees.forEach((tc: any) => {
            const key = `${tc.machineId}_${tc.idTache}`;
            completed[key] = true;
            if (tc.note) {
              notes[key] = tc.note;
            }
          });
          setCompletedTasks(completed);
          setTaskNotes(notes);
        } else {
          setCompletedTasks({});
          setTaskNotes({});
        }
      } else {
        console.error('❌ Intervention introuvable:', interventionId);
        console.log('🔄 Redirection vers le dashboard...');
        onNavigate('dashboard');
      }
    } catch (error) {
      console.error('❌ Erreur chargement intervention:', error);
      if (retryCount < 3) {
        setTimeout(() => {
          loadIntervention(retryCount + 1);
        }, 1000);
      } else {
        alert('❌ Erreur lors du chargement après plusieurs tentatives.');
        onNavigate('interventions');
      }
    }
  };

  const toggleTaskCompletion = async (machineId: string, taskId: string, sectionNom: string) => {
    // Protection : Si l'intervention est terminée, on ne fait rien
    if (intervention.statut === 'TERMINEE') return;

    const key = `${machineId}_${taskId}`;
    const isCompleted = completedTasks[key];

    const newCompleted = { ...completedTasks, [key]: !isCompleted };
    setCompletedTasks(newCompleted);

    const updatedTasksCompleted = isCompleted
      ? intervention.tachesCompletees.filter((tc: any) => !(tc.machineId === machineId && tc.idTache === taskId))
      : [
          ...(intervention.tachesCompletees || []),
          {
            idTache: taskId,
            machineId,
            sectionNom,
            completedAt: new Date().toISOString(),
            note: taskNotes[key] || ''
          }
        ];

    await updateIntervention(interventionId, {
      tachesCompletees: updatedTasksCompleted,
      tachesCompleteesCount: updatedTasksCompleted.length,
      progressionGlobale: Math.round((updatedTasksCompleted.length / intervention.totalTaches) * 100)
    });

    setIntervention(prev => ({ ...prev, tachesCompletees: updatedTasksCompleted, tachesCompleteesCount: updatedTasksCompleted.length }));
  };

  const toggleSectionComplete = async (machineId: string, section: any) => {
    // Protection : Si l'intervention est terminée, on ne fait rien
    if (intervention.statut === 'TERMINEE') {
      alert('❌ Cette intervention est terminée et verrouillée.');
      return;
    }

    if (!canValidateSections) {
      alert('❌ Vous n\'avez pas la permission de valider des sections entières.');
      return;
    }

    const isSectionCompleted = section.tachesIds?.every((taskId: string) => 
      completedTasks[`${machineId}_${taskId}`]
    );

    if (isSectionCompleted) {
      const newCompleted = { ...completedTasks };
      section.tachesIds?.forEach((taskId: string) => {
        delete newCompleted[`${machineId}_${taskId}`];
      });
      setCompletedTasks(newCompleted);

      const updatedTasksCompleted = intervention.tachesCompletees.filter((tc: any) => 
        !section.tachesIds?.includes(tc.idTache) || tc.machineId !== machineId
      );

      await updateIntervention(interventionId, {
        tachesCompletees: updatedTasksCompleted,
        tachesCompleteesCount: updatedTasksCompleted.length,
        progressionGlobale: Math.round((updatedTasksCompleted.length / intervention.totalTaches) * 100)
      });
    } else {
      const confirmed = window.confirm(
        `Valider les ${section.tachesIds?.length || 0} tâches de la section "${section.sectionNom}" ?`
      );
      
      if (!confirmed) return;

      const newCompleted = { ...completedTasks };
      const now = new Date().toISOString();
      const newTasksCompleted = [...(intervention.tachesCompletees || [])];

      section.tachesIds?.forEach((taskId: string) => {
        const key = `${machineId}_${taskId}`;
        if (!newCompleted[key]) {
          newCompleted[key] = true;
          newTasksCompleted.push({
            idTache: taskId,
            machineId,
            sectionNom: section.sectionNom,
            completedAt: now,
            note: ''
          });
        }
      });

      setCompletedTasks(newCompleted);

      await updateIntervention(interventionId, {
        tachesCompletees: newTasksCompleted,
        tachesCompleteesCount: newTasksCompleted.length,
        progressionGlobale: Math.round((newTasksCompleted.length / intervention.totalTaches) * 100)
      });

      setIntervention(prev => ({ ...prev, tachesCompletees: newTasksCompleted, tachesCompleteesCount: newTasksCompleted.length }));
    }
  };

  const handleSaveAndReturn = async () => {
    try {
      console.log('💾 Sauvegarde de la progression...');
      
      await updateIntervention(interventionId, {
        tachesCompletees: intervention.tachesCompletees || [],
        tachesCompleteesCount: intervention.tachesCompleteesCount || 0,
        progressionGlobale: Math.round(((intervention.tachesCompleteesCount || 0) / intervention.totalTaches) * 100),
        statut: intervention.tachesCompleteesCount > 0 ? 'EN_COURS' : 'PLANIFIEE',
        updatedAt: new Date().toISOString()
      });
      
      alert('✅ Progression enregistrée avec succès !');
      
      if (intervention?.clientId) {
        onNavigate('client-detail', { clientId: intervention.clientId });
      } else {
        onNavigate('interventions');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      alert('❌ Erreur lors de la sauvegarde');
    }
  };

  const handleCloturer = async () => {
    const progression = Math.round((intervention.tachesCompleteesCount / intervention.totalTaches) * 100);
    
    if (progression < 100) {
      const confirmed = window.confirm(
        `⚠️ Attention\n\n${progression}% des tâches sont complétées.\n${intervention.totalTaches - intervention.tachesCompleteesCount} tâches restent à faire.\n\nVoulez-vous vraiment clôturer cette intervention ?`
      );
      
      if (!confirmed) return;
    }

    try {
      await updateIntervention(interventionId, {
        statut: 'TERMINEE',
        dateFinReelle: new Date().toISOString(),
        clotureeManuallement: progression < 100,
        tauxCompletion: progression
      });

      alert(`✅ Intervention clôturée\n${progression}% des tâches complétées`);
      
      if (intervention?.clientId) {
        onNavigate('client-detail', { clientId: intervention.clientId });
      } else {
        onNavigate('interventions');
      }
    } catch (error) {
      console.error('Erreur clôture:', error);
      alert('❌ Erreur lors de la clôture');
    }
  };

  const calculateMachineProgression = (machine: any) => {
    let completed = 0;
    let total = 0;

    machine.sections?.forEach((section: any) => {
      total += section.tachesIds?.length || 0;
      section.tachesIds?.forEach((taskId: string) => {
        if (completedTasks[`${machine.machineId}_${taskId}`]) {
          completed++;
        }
      });
    });

    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const calculateSectionProgression = (machineId: string, section: any) => {
    const completed = section.tachesIds?.filter((taskId: string) => 
      completedTasks[`${machineId}_${taskId}`]
    ).length || 0;
    const total = section.tachesIds?.length || 0;

    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const isSectionCompleted = (machineId: string, section: any) => {
    return section.tachesIds?.every((taskId: string) => 
      completedTasks[`${machineId}_${taskId}`]
    ) || false;
  };

  const getCompletionInfo = (machineId: string, taskId: string) => {
    const task = intervention?.tachesCompletees?.find(
      (tc: any) => tc.machineId === machineId && tc.idTache === taskId
    );
    return task;
  };

  const formatCompletionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!intervention) {
    return (
      <Card className="text-center py-12">
        <p className="text-gray-500">Chargement de l'intervention...</p>
      </Card>
    );
  }

  const globalProgress = Math.round((intervention.tachesCompleteesCount / intervention.totalTaches) * 100) || 0;
  
  // ✅ ÉTAT DE VERROUILLAGE
  const isTerminated = intervention.statut === 'TERMINEE';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => {
            if (intervention?.clientId) {
              onNavigate('client-detail', { clientId: intervention.clientId });
            } else {
              onNavigate('interventions');
            }
          }}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              Intervention #{intervention.numeroIntervention}
            </h1>
            {isTerminated && (
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-200 text-gray-700 border border-gray-300">
                🔒 Consultation seule (Terminée)
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            {intervention.clientNom || 'Client'} - Démarrée : {new Date(intervention.dateDebut).toLocaleString('fr-FR')}
          </p>
        </div>
      </div>

      <Card className={`bg-gradient-to-r ${isTerminated ? 'from-gray-100 to-gray-200 border-gray-300' : 'from-blue-50 to-indigo-50 border-blue-200'}`}>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Progression globale</h3>
            <span className={`text-2xl font-bold ${isTerminated ? 'text-gray-600' : 'text-blue-600'}`}>
              {globalProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className={`h-4 rounded-full transition-all duration-300 ${isTerminated ? 'bg-gray-500' : 'bg-blue-600'}`}
              style={{ width: `${globalProgress}%` }}
            />
          </div>
          <p className="text-gray-700">
            {intervention.tachesCompleteesCount || 0} / {intervention.totalTaches || 0} tâches complétées
          </p>
        </div>
      </Card>

      <div className="space-y-4">
        {intervention.machines?.map((machine: any, machineIndex: number) => {
          const machineProgress = calculateMachineProgression(machine);
          const isExpanded = expandedMachines[machine.machineId];

          return (
            <Card key={machine.machineId} className="overflow-hidden">
              <div 
                className={`flex items-center justify-between p-4 ${isTerminated ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}
                onClick={() => !isTerminated && setExpandedMachines(prev => ({ ...prev, [machine.machineId]: !prev[machine.machineId] }))}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <div>
                    <h3 className="font-bold text-lg">
                      Machine {machineIndex + 1}/{intervention.machines.length} : {machine.machineNom}
                    </h3>
                    <p className="text-sm text-gray-600">Kit : {machine.kitNom}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${isTerminated ? 'text-gray-500' : 'text-blue-600'}`}>
                    {machineProgress.percentage}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {machineProgress.completed}/{machineProgress.total} tâches
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 pt-0 space-y-3">
                  {machine.sections?.map((section: any) => {
                    const sectionProgress = calculateSectionProgression(machine.machineId, section);
                    const sectionKey = `${machine.machineId}_${section.sectionNom}`;
                    const isSectionExpanded = expandedSections[sectionKey];

                    return (
                      <div key={section.sectionNom} className={`border-2 rounded-lg overflow-hidden transition-all ${
                        isSectionExpanded ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between p-3 bg-gray-50">
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              {isSectionExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            <input
                              type="checkbox"
                              checked={isSectionCompleted(machine.machineId, section)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (!isTerminated) toggleSectionComplete(machine.machineId, section);
                              }}
                              disabled={isTerminated}
                              className={`w-6 h-6 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer flex-shrink-0 ${
                                isTerminated ? 'cursor-not-allowed opacity-50' : 'text-indigo-600'
                              }`}
                            />
                            <span className="font-medium cursor-pointer flex-1 select-none">
                              {section.sectionNom} ({section.tachesIds?.length || 0} tâches)
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 font-semibold">
                              {sectionProgress.completed}/{sectionProgress.total} ✓
                            </span>
                          </div>
                        </div>

                        {isSectionExpanded && (
                          <>
                            <div className="px-3 pt-2 pb-1 bg-white">
                              <p className="text-xs text-gray-500 italic">
                                {isTerminated ? 'Historique figé' : 'Cliquez sur une tâche pour la cocher/décocher'}
                              </p>
                            </div>
                            <div className="p-3 space-y-2 bg-white">
                              {section.tachesIds?.map((taskId: string) => {
                                const key = `${machine.machineId}_${taskId}`;
                                const isCompleted = completedTasks[key];
                                const completionInfo = getCompletionInfo(machine.machineId, taskId);
                                const details = taskDetails[taskId];

                                return (
                                  <div
                                    key={taskId}
                                    className={`border-l-3 rounded transition-colors ${
                                      isCompleted ? 'border-l-4 border-green-500 bg-green-50' : 'border-l-4 border-gray-300 bg-white'
                                    } ${!isTerminated && 'hover:bg-gray-50'} p-3`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <input
                                        type="checkbox"
                                        checked={isCompleted || false}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          if (!isTerminated) toggleTaskCompletion(machine.machineId, taskId, section.sectionNom);
                                        }}
                                        disabled={isTerminated}
                                        className={`w-5 h-5 mt-1 rounded focus:ring-2 focus:ring-green-500 flex-shrink-0 ${
                                          isCompleted ? 'text-green-600' : 'text-gray-300'
                                        } ${isTerminated ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                      />
                                      <div className="flex-1">
                                        <div className={`font-medium ${
                                          isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                                        }`}>
                                          <strong>[{taskId}]</strong> {details?.description || `Tâche ${taskId}`}
                                        </div>
                                        
                                        {details && (details.module || details.etat || details.refPiece || details.quantite) && (
                                          <div className="text-xs text-gray-600 mt-1 space-x-2">
                                            {details.module && <span>Module : {details.module}</span>}
                                            {details.etat && <span>| État : {details.etat}</span>}
                                            {details.refPiece && <span>| Réf : {details.refPiece}</span>}
                                            {details.quantite && <span>| Qté : {details.quantite}</span>}
                                          </div>
                                        )}

                                        {isCompleted && completionInfo && (
                                          <div className="text-xs text-green-600 mt-2 italic">
                                            ✓ Complété le {formatCompletionDate(completionInfo.completedAt)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            <div className="px-3 pb-3 bg-white">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${sectionProgress.percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-indigo-600">
                                  {sectionProgress.percentage}%
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Pied de page Actions : Caché si l'intervention est terminée */}
      {!isTerminated && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">Actions</h3>
              <p className="text-sm text-gray-600">Statut : {intervention.statut}</p>
              <p className="text-xs text-gray-500 mt-1">
                💡 Enregistrez pour sauvegarder et y revenir plus tard
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleSaveAndReturn}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Enregistrer et retourner
              </Button>
              
              <Button
                onClick={handleCloturer}
                variant="primary"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle size={18} />
                {globalProgress === 100 ? '✓ Clôturer l\'intervention' : `✓ Clôturer (${globalProgress}%)`}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}