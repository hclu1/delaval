//useTachesEntretien.ts
import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useTachesEntretien() {
  const [loading, setLoading] = useState(false);

  const fetchTachesByKit = useCallback(async (kitId: string) => {
    setLoading(true);
    try {
      const result = await api.entities.taches_entretien.list({
        where: { kitId },  // ✅ CORRIGÉ
        sort: { ordre: 1 },
        limit: 200
      });
      return result.list || [];
    } catch (error) {
      console.error('Erreur chargement tâches:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSectionsByKit = useCallback(async (kitId: string) => {
    setLoading(true);
    try {
      const result = await api.entities.taches_entretien.list({
        where: { kitId },  // ✅ CORRIGÉ
        limit: 200
      });
      
      const sectionsSet = new Set<string>();
      (result.list || []).forEach((tache: any) => {
        if (tache.section) {
          sectionsSet.add(tache.section);
        }
      });
      
      return Array.from(sectionsSet).map(section => ({ 
        nom: section,
        kitId 
      }));
    } catch (error) {
      console.error('Erreur chargement sections:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTachesBySection = useCallback(async (kitId: string, section: string) => {
    setLoading(true);
    try {
      const result = await api.entities.taches_entretien.list({
        where: { kitId, section },  // ✅ CORRIGÉ
        sort: { ordre: 1 },
        limit: 200
      });
      return result.list || [];
    } catch (error) {
      console.error('Erreur chargement tâches par section:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const validateAllTasksInSection = useCallback(async (kitId: string, section: string) => {
    setLoading(true);
    try {
      const tasks = await fetchTachesBySection(kitId, section);
      
      const updatePromises = tasks.map((task: any) => 
        api.entities.taches_entretien.update(task._id, {
          completed: true,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );
      
      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      console.error('Erreur validation section:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchTachesBySection]);

  const getSectionsByKit = useCallback(async (kitId: string) => {
    console.log('🔍 [getSectionsByKit] kitId reçu:', kitId);
    
    setLoading(true);
    try {
      let taches = [];
      
      // ==========================================
      // MÉTHODE 1 : Charger le kit et utiliser customKitId
      // ==========================================
      console.log('📦 [Méthode 1] Recherche du kit dans maintenance_kits...');
      
      try {
        const kitResult = await api.entities.maintenance_kits.list({
          where: { _id: kitId },  // ✅ CORRIGÉ
          limit: 1
        });
        
        const kit = kitResult.list && kitResult.list.length > 0 ? kitResult.list[0] : null;
        
        if (kit) {
          console.log('✅ Kit trouvé:', {
            nom: kit.nom,
            machineType: kit.machineType,
            serviceNumber: kit.serviceNumber,
            customKitId: kit.customKitId
          });
          
          if (kit.customKitId) {
            console.log('🔍 [Méthode 1] Recherche avec customKitId =', kit.customKitId);
            const result1 = await api.entities.taches_entretien.list({
              where: { kitId: kit.customKitId },  // ✅ CORRIGÉ
              sort: { ordre: 1 },
              limit: 200
            });
            taches = result1.list || [];
            console.log(`→ [Méthode 1] ${taches.length} tâches trouvées`);
          } else {
            console.log('⚠️ [Méthode 1] Kit trouvé mais pas de customKitId');
          }
        } else {
          console.warn('⚠️ [Méthode 1] Kit introuvable dans maintenance_kits');
        }
      } catch (error) {
        console.warn('⚠️ [Méthode 1] Erreur:', error);
      }
      
      // ==========================================
      // MÉTHODE 2 : Recherche directe avec l'ObjectId
      // ==========================================
      if (taches.length === 0) {
        console.log('🔍 [Méthode 2] Recherche avec ObjectId =', kitId);
        try {
          const result2 = await api.entities.taches_entretien.list({
            where: { kitId: kitId },  // ✅ CORRIGÉ
            sort: { ordre: 1 },
            limit: 200
          });
          taches = result2.list || [];
          console.log(`→ [Méthode 2] ${taches.length} tâches trouvées`);
        } catch (error) {
          console.warn('⚠️ [Méthode 2] Erreur:', error);
        }
      }
      
      // ==========================================
      // MÉTHODE 3 : Recherche partielle (fallback)
      // ==========================================
      if (taches.length === 0) {
        console.log('🔍 [Méthode 3] Recherche partielle...');
        try {
          const kitResult = await api.entities.maintenance_kits.list({
            where: { _id: kitId },  // ✅ CORRIGÉ
            limit: 1
          });
          
          const kit = kitResult.list && kitResult.list.length > 0 ? kitResult.list[0] : null;
          
          if (kit && kit.machineType && kit.serviceNumber) {
            console.log('🔍 [Méthode 3] Recherche par pattern:', {
              machineType: kit.machineType,
              serviceNumber: kit.serviceNumber
            });
            
            const allTasksResult = await api.entities.taches_entretien.list({
              limit: 1000
            });
            
            const allTasks = allTasksResult.list || [];
            console.log(`📦 [Méthode 3] ${allTasks.length} tâches au total dans la base`);
            
            if (allTasks.length > 0) {
              const sampleKitIds = [...new Set(allTasks.slice(0, 10).map(t => t.kitId))];
              console.log('📋 [Méthode 3] Exemples de kitId dans la base:', sampleKitIds);
            }
            
            const machineTypeNormalized = kit.machineType.toLowerCase().replace(/\s+/g, '');
            console.log('🔍 [Méthode 3] Pattern recherché:', machineTypeNormalized, '+ _' + kit.serviceNumber);
            
            taches = allTasks.filter(task => {
              if (!task.kitId) return false;
              
              const taskKitIdLower = task.kitId.toLowerCase();
              const matchMachine = taskKitIdLower.includes(machineTypeNormalized);
              const matchService = taskKitIdLower.includes(`_${kit.serviceNumber}`);
              
              if (matchMachine && matchService) {
                console.log('✅ [Méthode 3] Match trouvé:', task.kitId);
                return true;
              }
              return false;
            });
            
            console.log(`→ [Méthode 3] ${taches.length} tâches trouvées par recherche partielle`);
          } else {
            console.warn('⚠️ [Méthode 3] Kit non trouvé ou données incomplètes');
          }
        } catch (error) {
          console.warn('⚠️ [Méthode 3] Erreur:', error);
        }
      }
      
      // ==========================================
      // RÉSULTAT FINAL
      // ==========================================
      if (taches.length === 0) {
        console.error('❌ AUCUNE MÉTHODE N\'A TROUVÉ DE TÂCHES');
        console.log('💡 Débug info - kitId recherché:', kitId);
        console.log('💡 Vérifiez dans Administration > taches_entretien que des tâches existent avec ce kitId');
        return [];
      }
      
      console.log('✅ Total tâches trouvées:', taches.length);
      
      if (taches.length > 0) {
        console.log('📋 Première tâche:', {
          idTache: taches[0].idTache,
          section: taches[0].section,
          description: taches[0].description,
          kitId: taches[0].kitId
        });
      }
      
      // ==========================================
      // GROUPEMENT PAR SECTION
      // ==========================================
      const sectionsMap = new Map<string, any[]>();
      taches.forEach((tache: any) => {
        if (tache.section) {
          if (!sectionsMap.has(tache.section)) {
            sectionsMap.set(tache.section, []);
          }
          sectionsMap.get(tache.section)!.push(tache);
        }
      });
      
      const finalSections = Array.from(sectionsMap.entries()).map(([nom, taches]) => ({
        nom,
        count: taches.length,
        taches: taches.sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
      }));

      console.log('✅ Sections groupées:', finalSections.length);
      if (finalSections.length > 0) {
        console.log('📋 Sections:', finalSections.map(s => `${s.nom} (${s.count} tâches)`).join(', '));
      }
      
      return finalSections;
      
    } catch (error) {
      console.error('❌ Erreur getSectionsByKit:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTachesEntretien = useCallback(async (filters: any = {}) => {
    setLoading(true);
    try {
      const result = await api.entities.taches_entretien.list({
        where: filters,  // ✅ CORRIGÉ (était filter: filters)
        sort: { ordre: 1 },
        limit: 200
      });
      return result.list || [];
    } catch (error) {
      console.error('Erreur chargement tâches d\'entretien:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    fetchTachesByKit,
    fetchSectionsByKit,
    fetchTachesBySection,
    validateAllTasksInSection,
    getSectionsByKit,
    fetchTachesEntretien
  };
}
