// src/screens/interventions/TaskExecutionScreen.tsx

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ArrowLeft, CheckCircle, Circle, Wrench } from 'lucide-react';
import { useMachines } from '../../hooks/useMachines';
import { useTachesEntretien } from '../../hooks/useTachesEntretien';

interface Props {
  onNavigate: (screen: string, params?: any) => void;
  machineId: string;
  kitId: string;
  sectionName: string;
  sectionsData?: any[];
  machineKitSelections?: Array<{ machineId: string; kitId: string }>;
  clientId?: string;
  resumeInterventionId?: string; // ✅ AJOUT
  savedSectionsState?: any[]; // ✅ AJOUT
}

export function TaskExecutionScreen({ 
  onNavigate, 
  machineId, 
  kitId, 
  sectionName,
  sectionsData,
  machineKitSelections,
  clientId,
  resumeInterventionId, // ✅ AJOUT
  savedSectionsState // ✅ AJOUT
}: Props) {
  const { getMachineById } = useMachines();
  const { fetchTachesBySection } = useTachesEntretien();
  const [machine, setMachine] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      console.log('🔍 [DEBUG] sectionsData reçu:', sectionsData);
      
      const machineData = await getMachineById(machineId);
      setMachine(machineData);
      
      if (sectionsData && sectionsData.length > 0) {
        console.log('✅ [MODE LOCAL] Utilisation des données passées en paramètre');
        const section = sectionsData.find(s => s.nom === sectionName);
        
        if (section && section.taches) {
          setTasks(section.taches);
          console.log(`✅ ${section.taches.length} tâches chargées localement`);
          console.log(`📊 Tâches complétées: ${section.taches.filter(t => t.completed).length}`);
        } else {
          console.error('❌ Section introuvable dans les données locales');
          const tasksData = await fetchTachesBySection(kitId, sectionName);
          const tachesVierges = tasksData.map((t: any) => ({
            ...t,
            completed: false,
            completedAt: null
          }));
          setTasks(tachesVierges);
        }
      } else {
        console.log('⚠️ [FALLBACK] Pas de données locales, forçage à zéro');
        const tasksData = await fetchTachesBySection(kitId, sectionName);
        const tachesVierges = tasksData.map((t: any) => ({
          ...t,
          completed: false,
          completedAt: null
        }));
        setTasks(tachesVierges);
      }
      
      setLoading(false);
    };
    loadData();
  }, [machineId, kitId, sectionName, sectionsData]);

const handleReturn = () => {
  console.log('🔙 [RETOUR] Envoi des données mises à jour...');
  console.log('🔍 [DEBUG] sectionsData au moment du retour:', sectionsData);
  console.log('🔍 [DEBUG] tasks au moment du retour:', tasks);
  console.log('🔍 [DEBUG] resumeInterventionId:', resumeInterventionId); // ✅ LOG
  
  // ✅ sectionsData est un TABLEAU, pas un objet
  // On doit le reconstruire sous forme d'objet { machineId: [sections] }
  
  // 1. On met à jour la section actuelle avec les tâches modifiées
  const sectionActuelle = {
    nom: sectionName,
    taches: tasks,
    count: tasks.length
  };

  // 2. On récupère TOUTES les sections de cette machine
  const toutesLesSections = sectionsData || [];
  
  // 3. On remplace la section modifiée, on garde les autres
  const sectionsMAJ = toutesLesSections.map(section => 
    section.nom === sectionName 
      ? sectionActuelle
      : section
  );

  console.log('📦 [DEBUG] Sections mises à jour:', sectionsMAJ);

  // 4. On crée l'objet final { machineId: [sections] }
  const dataARenvoyer = {
    [machineId]: sectionsMAJ
  };

  console.log('📦 [DEBUG] Données renvoyées:', dataARenvoyer);

  // 5. Navigation avec TOUTES les infos (y compris resumeInterventionId) ✅
  onNavigate('multi-machine-section-selection', {
    clientId: clientId, 
    machineKitSelections: machineKitSelections || [{ machineId, kitId }],
    updatedSectionsData: dataARenvoyer,
    resumeInterventionId: resumeInterventionId, // ✅ TRANSMISSION
    savedSectionsState: savedSectionsState // ✅ TRANSMISSION
  });
};



  const handleTaskToggle = (taskId: string, currentCompleted: boolean) => {
    console.log(`🔄 Toggle tâche ${taskId}: ${currentCompleted} → ${!currentCompleted}`);
    
    const updatedTasks = tasks.map(task =>
      task._id === taskId || task.idTache === taskId
        ? { 
            ...task, 
            completed: !currentCompleted,
            completedAt: !currentCompleted ? new Date().toISOString() : null
          } 
        : task
    );
    
    setTasks(updatedTasks);
    console.log(`📊 Tâches complétées: ${updatedTasks.filter(t => t.completed).length}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Chargement des données...</div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Machine introuvable</div>
      </div>
    );
  }

  const validatedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={handleReturn}
        >
          <ArrowLeft size={20} /> Retour aux sections
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tâches de la section</h1>
          <p className="text-gray-600 mt-1">{sectionName}</p>
        </div>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Wrench size={20} />
          {machine.nom} - {machine.numeroSerie}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Progression : {validatedCount} / {tasks.length} tâches validées
        </p>
        
        {tasks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune tâche disponible pour cette section</p>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <label 
                key={task._id || task.idTache} 
                className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={task.completed || false}
                  onChange={() => handleTaskToggle(task._id || task.idTache, task.completed)}
                  className="sr-only"
                />
                
                <div className="mr-3 flex-shrink-0">
                  {task.completed ? (
                    <CheckCircle className="text-green-500" size={20} />
                  ) : (
                    <Circle className="text-gray-400" size={20} />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {task.idTache && <strong>[{task.idTache}]</strong>} {task.description || 'Tâche sans description'}
                  </div>
                  {task.refPiece && <div className="text-sm text-gray-600">Pièce : {task.refPiece}</div>}
                  {task.module && <div className="text-sm text-gray-600">Module : {task.module}</div>}
                  {task.etat && <div className="text-sm text-gray-600">État : {task.etat}</div>}
                </div>
              </label>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}