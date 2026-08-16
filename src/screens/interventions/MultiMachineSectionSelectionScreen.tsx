// src/screens/interventions/MultiMachineSectionSelectionScreen.tsx

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {ArrowLeft, Wrench} from 'lucide-react';
import { useMachines } from '../../hooks/useMachines';
import { useTachesEntretien } from '../../hooks/useTachesEntretien';
import { useInterventions } from '../../hooks/useInterventions';
import { useUsers } from '../../hooks/useUsers';
import { useClients } from '../../hooks/useClients'; // ✅ AJOUT
import { generateMaintenanceReportPDF } from '../../utils/pdfGenerator'; // ✅ AJOUT


interface Props {
  onNavigate: (screen: string, params?: any) => void;
  clientId: string;
  machineKitSelections: Array<{ machineId: string; kitId: string }>;
  updatedSectionsData?: Record<string, any[]>;
  resumeInterventionId?: string;
  savedSectionsState?: any[];
}

export function MultiMachineSectionSelectionScreen({ 
  onNavigate, 
  clientId, 
  machineKitSelections,
  updatedSectionsData,
  resumeInterventionId,
  savedSectionsState
}: Props) {
  const [machines, setMachines] = useState<any[]>([]);
  const [sectionsData, setSectionsData] = useState<Record<string, any[]>>({});
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  
  const { getMachineById } = useMachines();
  const { getSectionsByKit, fetchTachesBySection } = useTachesEntretien();
  const { createIntervention, updateIntervention } = useInterventions();
  const { users, fetchUsers } = useUsers();
   const { getClientById } = useClients(); 
  const [client, setClient] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

   // ✅ AJOUT : useEffect pour charger le client
  useEffect(() => {
    const loadClient = async () => {
      if (clientId) {
        const c = await getClientById(clientId);
        setClient(c);
      }
    };
    loadClient();
  }, [clientId]);

  useEffect(() => {
    fetchUsers({ limit: 100 });
  }, []);

  useEffect(() => {
    if (users && users.length > 0 && !currentUser) {
      setCurrentUser(users[0]);
      console.log('👤 Utilisateur chargé:', users[0]?.name || users[0]);
    }
  }, [users, currentUser]);
  
  const peutValiderSection = (role: string) => {
    return ['Chef Technicien CMS', 'Chef Technicien VMS', 'Responsable Technique', 'Directeur', 'Administrateur'].includes(role);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const machinesData = await Promise.all(
        machineKitSelections.map(sel => getMachineById(sel.machineId))
      );
      setMachines(machinesData.filter(Boolean));

      // ✅ PRIORITÉ 1 : Retour depuis TaskExecution (DONNÉES FRAÎCHES)
      if (updatedSectionsData && Object.keys(updatedSectionsData).length > 0) {
        console.log('✅ [RETOUR] Données reçues de TaskExecution, conservation des modifications');
        setSectionsData(prev => {
          const newData = { ...prev };
          Object.keys(updatedSectionsData).forEach(machineId => {
            newData[machineId] = updatedSectionsData[machineId];
          });
          return newData;
        });
        setLoading(false);
        return;
      }

      // ✅ PRIORITÉ 2 : Reprise d'intervention (depuis la BDD)
      if (resumeInterventionId && savedSectionsState) {
        console.log('✅ [REPRISE INTERVENTION] Chargement depuis la sauvegarde BDD');
        
        const sectionsMap: Record<string, any[]> = {};
        const restoredSelections: Record<string, string[]> = {};
        
        for (const sel of machineKitSelections) {
          const allSections = await getSectionsByKit(sel.kitId);
          const selectedSectionNames: string[] = [];
          
          const sectionsWithProgress = allSections.map(section => {
            const savedSection = savedSectionsState.find(
              (s: any) => s.machineId === sel.machineId && s.sectionName === section.nom
            );
            
            if (savedSection) {
              selectedSectionNames.push(section.nom);
              
              const tachesWithProgress = section.taches?.map((tache: any) => {
                const savedTask = savedSection.tasks?.find(
                  (t: any) => t.id === tache.idTache || t.id === tache.id || t.description === tache.description
                );
                
                if (savedTask) {
                  return {
                    ...tache,
                    completed: savedTask.completed || false,
                    completedAt: savedTask.completedAt || null
                  };
                }
                
                return {
                  ...tache,
                  completed: false,
                  completedAt: null
                };
              }) || [];
              
              return { ...section, taches: tachesWithProgress };
            }
            
            return {
              ...section,
              taches: section.taches?.map((tache: any) => ({
                ...tache,
                completed: false,
                completedAt: null
              })) || []
            };
          });
          
          sectionsMap[sel.machineId] = sectionsWithProgress;
          restoredSelections[sel.machineId] = selectedSectionNames;
        }
        
        setSectionsData(sectionsMap);
        setSelections(restoredSelections);
        setLoading(false);
        return;
      }

      // ✅ PRIORITÉ 3 : Nouvelle intervention
      console.log('🔄 [NOUVELLE INTERVENTION] Chargement des sections vides');
      setSectionsData({});
      setSelections({});
      
      const sectionsMap: Record<string, any[]> = {};
      const initialSelections: Record<string, string[]> = {};

      for (const sel of machineKitSelections) {
        const sections = await getSectionsByKit(sel.kitId);
        initialSelections[sel.machineId] = [];

        const sectionsVierges = sections.map(section => ({
          ...section,
          taches: section.taches?.map((tache: any) => ({
            ...tache,
            completed: false,
            completedAt: null
          })) || []
        }));
        sectionsMap[sel.machineId] = sectionsVierges;
      }

      setSectionsData(sectionsMap);
      setSelections(initialSelections);
      setLoading(false);
    };
    loadData();
  }, [machineKitSelections, updatedSectionsData, resumeInterventionId, savedSectionsState]);

  useEffect(() => {
    const newSelections: Record<string, string[]> = {};

    Object.keys(sectionsData).forEach(machineId => {
      const sections = sectionsData[machineId];
      const selectedSectionNames: string[] = [];

      sections.forEach(section => {
        const allTasksCompleted = section.taches &&
            section.taches.length > 0 &&
            section.taches.every((t: any) => t.completed === true);

        if (allTasksCompleted) {
          selectedSectionNames.push(section.nom);
        }
      });

      newSelections[machineId] = selectedSectionNames;
    });

    if (JSON.stringify(newSelections) !== JSON.stringify(selections)) {
      setSelections(newSelections);
    }
  }, [sectionsData]);


  const validerTachesDeLaSection = async (machineId: string, kitId: string, nomSection: string) => {
    try {
      const taches = await fetchTachesBySection(kitId, nomSection);
      console.log(`✅ Validation de ${taches.length} tâches pour "${nomSection}"`);
      
      setSectionsData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const sections = newData[machineId] || [];
        const updatedSections = sections.map((section: any) => {
          if (section.nom === nomSection) {
            const updatedTaches = section.taches.map((t: any) => ({ 
              ...t, 
              completed: true,
              completedAt: new Date().toISOString()
            }));
            return { ...section, taches: updatedTaches };
          }
          return section;
        });
        newData[machineId] = updatedSections;
        return newData;
      });

    } catch (error) {
      console.error('Erreur validation section:', error);
    }
  };

  const handleSectionToggle = async (machineId: string, sectionName: string) => {
    const isSelected = selections[machineId]?.includes(sectionName);
    const kitId = machineKitSelections.find(s => s.machineId === machineId)?.kitId || '';
    
    if (isSelected) {
      console.log(`🔄 Décochage de la section "${sectionName}"`);
      setSectionsData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const sections = newData[machineId] || [];
        const updatedSections = sections.map((section: any) => {
          if (section.nom === sectionName) {
            const updatedTaches = section.taches.map((t: any) => ({ 
              ...t, 
              completed: false,
              completedAt: null 
            }));
            return { ...section, taches: updatedTaches };
          }
          return section;
        });
        newData[machineId] = updatedSections;
        return newData;
      });
    } else {
      console.log(`✅ Cochage de la section "${sectionName}"`);
      await validerTachesDeLaSection(machineId, kitId, sectionName);
    }
  };

  const handleValiderSectionEntiere = async (machineId: string, kitId: string, nomSection: string) => {
    await validerTachesDeLaSection(machineId, kitId, nomSection);
  };

  const getTotalAndCompletedTasks = () => {
    let total = 0;
    let completed = 0;
    
    machineKitSelections.forEach(sel => {
      const sections = sectionsData[sel.machineId] || [];
      const selectedSectionNames = selections[sel.machineId] || [];
      
      sections
        .filter(s => selectedSectionNames.includes(s.nom))
        .forEach(section => {
          const tasks = section.taches || [];
          total += tasks.length;
          completed += tasks.filter((t: any) => t.completed).length;
        });
    });
    
    return { total, completed };
  };
  
  // ✅ NOUVELLE FONCTION : Calculer le progrès global (pour l'enregistrement)
  const getGlobalProgress = () => {
    let total = 0;
    let completed = 0;
    
    Object.values(sectionsData).forEach(sections => {
      sections.forEach(section => {
        if (section.taches) {
          total += section.taches.length;
          completed += section.taches.filter((t: any) => t.completed).length;
        }
      });
    });
    
    return { total, completed };
  };

  const { total: totalTasksCount, completed: completedCount } = getGlobalProgress();

  const areAllSectionsSelected = () => {
    for (const sel of machineKitSelections) {
      const sections = sectionsData[sel.machineId] || [];
      const selectedSectionNames = selections[sel.machineId] || [];
      
      if (selectedSectionNames.length !== sections.length) {
        return false;
      }
    }
    return true;
  };

  const isAllTasksCompleted = () => {
    if (totalTasksCount === 0) return false;
    return completedCount === totalTasksCount;
  };

  const canCloturer = () => {
    return areAllSectionsSelected() && isAllTasksCompleted();
  };

  const handleSaveAsDraft = async () => {
    // ✅ On autorise la sauvegarde même si 0 tâches, du moment qu'il y a des machines
    if (machineKitSelections.length === 0) {
      alert('⚠️ Aucune machine sélectionnée');
      return;
    }
    
    try {
      console.log('💾 [1/6] Enregistrement du brouillon...');
      
      const finalClientId = clientId || (machines && machines.length > 0 ? machines[0]?.clientId : null);
      
      if (!finalClientId) {
        alert('❌ Erreur: Client non trouvé');
        return;
      }
      
      console.log('✅ [2/6] ClientId validé:', finalClientId);

      // ✅ CORRECTION ICI : Sauvegarder TOUTES les sections avec progrès
      const selectedSectionsData = machineKitSelections.map(sel => {
        const machine = machines.find(m => m._id === sel.machineId);
        const sections = sectionsData[sel.machineId] || [];
        
        const machineSections = sections
          .filter(section => {
            // On sauvegarde la section si :
            // 1. Elle est cochée (dans selections)
            // 2. OU elle a au moins une tâche complétée (progrès partiel)
            const isSelected = selections[sel.machineId]?.includes(section.nom);
            const hasProgress = section.taches?.some((t: any) => t.completed);
            return isSelected || hasProgress;
          })
          .map(section => ({
            machineId: sel.machineId,
            machineName: machine?.nom || '',
            sectionName: section.nom,
            tasks: section.taches?.map((t: any) => ({
              id: t.idTache || t.id,
              description: t.description,
              completed: t.completed || false,
              completedAt: t.completedAt || null,
              ordre: t.ordre || 0,
              refPiece: t.refPiece,
              quantite: t.quantite,
              module: t.module
            })) || []
          }));
        
        return machineSections;
      }).flat();

      console.log('✅ [3/6] Sections préparées:', selectedSectionsData.length);

      const { total, completed } = getGlobalProgress();
      const progression = total > 0 ? Math.round((completed / total) * 100) : 0;

      console.log('✅ [4/6] Progression:', `${completed}/${total} (${progression}%)`);

      const now = new Date();
      const userId = currentUser?._id || users?.[0]?._id || '000';
      const numeroTechnicien = userId.toString().slice(-3);
      const numeroIntervention = 
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        numeroTechnicien;

      const interventionData = {
        type: 'MAINTENANCE',
        numeroIntervention,
        clientId: finalClientId,
        machineIds: machineKitSelections.map(s => s.machineId),
        userId: currentUser?._id,
        technicianName: currentUser?.name,
        status: 'EN_COURS',
        statut: 'EN_COURS',
        progress: progression,
        createdAt: new Date().toISOString(),
        selectedSections: selectedSectionsData,
        kits: machineKitSelections.map(sel => {
          const machine = machines.find(m => m._id === sel.machineId);
          return {
            machineId: sel.machineId,
            machineName: machine?.nom,
            kitId: sel.kitId
          };
        }),
        totalTasks: total,
        completedTasks: completed,
        actionsRealisees: `Entretien en cours - ${completed}/${total} tâches complétées (${progression}%)`,
        diagnostic: `Sections: ${selectedSectionsData.map(s => s.sectionName).join(', ')}`
      };

      let newIntervention;

      if (resumeInterventionId) {
        console.log('🔄 [5/6] UPDATE de l\'intervention existante:', resumeInterventionId);
        newIntervention = await updateIntervention(resumeInterventionId, interventionData);
      } else {
        console.log('➕ [5/6] CREATE nouvelle intervention');
        newIntervention = await createIntervention(interventionData);
      }      
      console.log('✅ [6/6] Intervention enregistrée:', newIntervention);
      
      if (!newIntervention || !newIntervention._id) {
        throw new Error('Pas d\'_id retourné');
      }
      
      console.log('🎉 ID intervention:', newIntervention._id);
      
      alert(`✅ Intervention enregistrée avec succès !\n\nID: ${newIntervention._id}\nProgression: ${progression}%\nTâches: ${completed}/${total}\n\nVous pouvez la reprendre à tout moment depuis la page client.`);
      
      console.log('🚀 Navigation vers client-detail');
      onNavigate('client-detail', { clientId: finalClientId });
      
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      alert(`❌ Erreur lors de l'enregistrement:\n${error.message}`);
    }
  };

  const handleCloturer = async () => {
    // ... (Logique de validation inchangée)
    
    if (!areAllSectionsSelected()) {
       const totalSections = machineKitSelections.reduce((sum, sel) => {
        return sum + (sectionsData[sel.machineId]?.length || 0);
      }, 0);
      
      const selectedSectionsCount = Object.values(selections).reduce((sum, arr) => sum + arr.length, 0);
      
      alert(
        `❌ Impossible de clôturer l'intervention\n\nVous devez cocher TOUTES les sections.\n\nSections cochées : ${selectedSectionsCount}/${totalSections}\n\n💡 Utilisez le bouton "💾 Enregistrer" pour sauvegarder votre progression.`
      );
      return;
    }
    
    const { total, completed } = getGlobalProgress();
    
    if (completed < total) {
       alert(
        `❌ Impossible de clôturer l'intervention\n\nVous devez compléter TOUTES les tâches.\n\nProgression : ${completed}/${total}`
      );
      return;
    }
    
    try {
      console.log('💾 Début de la clôture...');
      
      const finalClientId = clientId || (machines && machines.length > 0 ? machines[0]?.clientId : null);
      
      if (!finalClientId) {
        alert('❌ Erreur: Client non trouvé');
        return;
      }

      // Préparation des données de sections
      const selectedSectionsData = machineKitSelections.map(sel => {
        const machine = machines.find(m => m._id === sel.machineId);
        const sections = sectionsData[sel.machineId] || [];
        
        const machineSections = sections.map(section => ({
            machineId: sel.machineId,
            machineName: machine?.nom || '',
            sectionName: section.nom,
            tasks: section.taches?.map((t: any) => ({
              id: t.idTache || t.id,
              description: t.description,
              completed: t.completed || false,
              completedAt: t.completedAt || null,
              ordre: t.ordre || 0,
              refPiece: t.refPiece,
              quantite: t.quantite,
              module: t.module
            })) || []
          }));
        
        return machineSections;
      }).flat();

      const now = new Date();
      const userId = currentUser?._id || users?.[0]?._id || '000';
      const numeroTechnicien = userId.toString().slice(-3);
      const numeroIntervention = 
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        numeroTechnicien;

      const interventionData = {
        type: 'MAINTENANCE',
        numeroIntervention,
        clientId: finalClientId,
        machineIds: machineKitSelections.map(s => s.machineId),
        userId: currentUser?._id,
        technicianName: currentUser?.name,
        status: 'terminé',
        statut: 'TERMINEE',
        progress: 100,
        createdAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        selectedSections: selectedSectionsData,
        kits: machineKitSelections.map(sel => {
          const machine = machines.find(m => m._id === sel.machineId);
          return {
            machineId: sel.machineId,
            machineName: machine?.nom,
            kitId: sel.kitId
          };
        }),
        totalTasks: total,
        completedTasks: completed,
        actionsRealisees: `Entretien 100% complété - ${completed}/${total} tâches`,
        diagnostic: `Sections: ${selectedSectionsData.map(s => s.sectionName).join(', ')}`
      };

      let savedIntervention;
      
      if (resumeInterventionId) {
        console.log('🔄 UPDATE et CLÔTURE de l\'intervention existante:', resumeInterventionId);
        savedIntervention = await updateIntervention(resumeInterventionId, interventionData);
      } else {
        console.log('➕ CREATE et CLÔTURE nouvelle intervention');
        savedIntervention = await createIntervention(interventionData);
      }
      
      // ═══════════════════════════════════════════════════════════════
      // ✅ NOUVEAU : GÉNÉRATION ET ENVOI DU PDF
      // ═══════════════════════════════════════════════════════════════
      try {
        console.log('📄 Génération du rapport PDF...');
        
        const pdfDoc = await generateMaintenanceReportPDF({
          intervention: savedIntervention, // L'intervention fraîchement sauvegardée
          client: client, // Le client chargé via le hook
          machines: machines, // Les machines chargées
          selectedSections: selectedSectionsData, // Les sections détaillées
          technician: currentUser // L'utilisateur connecté
        });

        // 1. Ouvrir le PDF dans un nouvel onglet (pour vérification/impression)
const techUser = currentUser?._id ? await lumi.entities.utilisateurs.get(currentUser._id) : null;
if (techUser?.sendEmailReport !== false) {
  const { sendClientInterventionNotification } = await import('../../services/clientNotificationService');
  await sendClientInterventionNotification({
    clientId: finalClientId,
    interventionType: 'MAINTENANCE',
    numeroIntervention: interventionData.numeroIntervention,
    dateIntervention: new Date().toISOString(),
    pdfDoc: pdfDoc,
    technicienId: currentUser?._id
  });
}        
        alert(`✅ Intervention clôturée !\n\nLe rapport PDF a été ouvert dans un nouvel onglet.`);

      } catch (pdfError) {
        console.error('❌ Erreur génération PDF:', pdfError);
        alert(`✅ Intervention clôturée (mais erreur lors de la génération du PDF).`);
      }
      
      onNavigate('client-detail', { clientId: finalClientId });
      
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      alert(`❌ Erreur:\n${error.message}`);
    }
  };
  if (loading) {
    return (
      <Card className="text-center py-12">
        <p>Chargement des sections d'entretien...</p>
      </Card>
    );
  }

  return (
    <div key={`sections-${machineKitSelections.map(s => s.kitId).join('-')}`} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => onNavigate('multi-machine-kit-selection', { 
            clientId, 
            machineIds: machineKitSelections.map(s => s.machineId) 
          })}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sélection des Sections d'Entretien</h1>
          <p className="text-gray-600 mt-1">Choisissez les sections à effectuer pour chaque machine.</p>
        </div>
      </div>

      {machines.map((machine) => {
        const selection = machineKitSelections.find(s => s.machineId === machine._id);
        if (!selection) return null;

        const sections = sectionsData[machine._id] || [];
        const selectedSections = selections[machine._id] || [];

        return (
          <Card key={machine._id}>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench size={20} />
              {machine.nom} - {machine.numeroSerie}
            </h2>

            {sections.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">Sections disponibles :</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sections.map(section => {
                    const { nom, count, taches } = section;
                    const isSelected = selectedSections.includes(nom);
                    const nombreValidees = taches?.filter((t: any) => t.completed).length || 0;
                    
                    return (
                      <div
                        key={nom}
                        className={`p-4 border rounded-lg transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSectionToggle(machine._id, nom)}
                              className="mr-3 h-5 w-5 text-blue-600 cursor-pointer"
                            />
                            <span 
                              className="font-medium text-gray-900 cursor-pointer flex-1"
                              onClick={() => onNavigate('task-execution', { 
                                machineId: machine._id, 
                                kitId: selection.kitId, 
                                sectionName: nom,
                                sectionsData: sectionsData[machine._id],
                                machineKitSelections: machineKitSelections,
                                clientId: clientId,
                                resumeInterventionId: resumeInterventionId,
                                savedSectionsState: savedSectionsState
                              })}                            >
                              {nom}
                            </span>
                          </div>
                          
                          {peutValiderSection(currentUser?.role || '') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleValiderSectionEntiere(machine._id, selection.kitId, nom);
                              }}
                              className="text-xs flex-shrink-0"
                            >
                              Valider tout
                            </Button>
                          )}
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            Progression : {nombreValidees} / {count} tâches validées
                          </p>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                            <div
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${count > 0 ? (nombreValidees / count) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-blue-600 font-medium cursor-pointer"
                            onClick={() => onNavigate('task-execution', { 
                              machineId: machine._id, 
                              kitId: selection.kitId, 
                              sectionName: nom,
                              sectionsData: sectionsData[machine._id],
                              machineKitSelections: machineKitSelections,
                              clientId: clientId,
                              resumeInterventionId: resumeInterventionId,
                              savedSectionsState: savedSectionsState
                            })}                          >
                            Cliquez pour voir les tâches
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-red-600">Aucune section d'entretien trouvée pour ce kit.</p>
            )}
          </Card>
        );
      })}

      {/* Boutons d'action */}
      <div className="flex justify-between pt-4 border-t">
        <div className="text-sm text-gray-600">
          <p>Sections : {Object.values(selections).reduce((sum, arr) => sum + arr.length, 0)}/{machineKitSelections.reduce((sum, sel) => sum + (sectionsData[sel.machineId]?.length || 0), 0)} cochées</p>
          <p>Tâches : {completedCount}/{totalTasksCount} complétées
            {totalTasksCount > 0 && ` (${Math.round((completedCount / totalTasksCount) * 100)}%)`}
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleSaveAsDraft}
          >
            💾 Enregistrer
          </Button>
          
          <Button 
            onClick={handleCloturer}
            disabled={!canCloturer()}
            className={`${
              canCloturer() 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canCloturer() ? '✅ Clôturer' : '🔒 Clôturer'} ({completedCount}/{totalTasksCount})
          </Button>
        </div>
      </div>
    </div>
  );
}