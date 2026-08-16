//useMaintenanceKits.ts
import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useMaintenanceKits() {
  const [maintenanceKits, setMaintenanceKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fonction 1 : fetchMaintenanceKits
  const fetchMaintenanceKits = useCallback(async (filter?: any) => {
    setLoading(true);
    try {
      const result = await api.entities.maintenance_kits.list({
        where: filter,
        sort: { serviceNumber: 1 }
      });
      setMaintenanceKits(result.list || []);
    } catch (error) {
      console.error('Erreur chargement kits:', error);
      setMaintenanceKits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Fonction 2 : getKitsByMachineType
  const getKitsByMachineType = useCallback(async (machineType: string) => {
    setLoading(true);
    try {
      const result = await api.entities.maintenance_kits.list({
        where: { machineType, actif: true },
        sort: { serviceNumber: 1 }
      });
      return result.list || [];
    } catch (error) {
      console.error('Erreur chargement kits:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 🆕 Fonction 3 : getKitsByMachineModels (AJOUTÉE ICI, AVANT LE RETURN)
  const getKitsByMachineModels = useCallback(async (machineModels: string[]) => {
    console.log('🔍 [useMaintenanceKits] Filtrage kits pour modèles:', machineModels);
    
    setLoading(true);
    try {
      // Normaliser les modèles pour éviter les problèmes d'espaces
    const normalizedModels = machineModels
  .filter(model => model && typeof model === 'string') // Retirer null/undefined/non-string
  .map(model => model.replace(/\s+/g, ' ').trim());
      
      console.log('📋 Modèles normalisés:', normalizedModels);
      
      // Requête avec in pour matcher plusieurs modèles
      const result = await api.entities.maintenance_kits.list({
        where: { 
          machineType: { in: normalizedModels },
          actif: true
        },
        sort: { serviceNumber: 1 }
      });
      
      const kits = result.list || [];
      console.log(`✅ [useMaintenanceKits] ${kits.length} kits trouvés`);
      
      // Si aucun kit avec correspondance exacte, recherche partielle
      if (kits.length === 0) {
        console.log('⚠️ Aucun kit exact, recherche partielle...');
        
        const allKitsResult = await api.entities.maintenance_kits.list({
          where: { actif: true },
          sort: { serviceNumber: 1 }
        });
        
        const allKits = allKitsResult.list || [];
        
        const partialMatch = allKits.filter(kit => {
          if (!kit.machineType) return false;
          
          const kitTypes = kit.machineType.split(/[,/]/).map((t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim());
          
          return normalizedModels.some(model => {
            const modelLower = model.toLowerCase();
            return kitTypes.some((kt: string) => {
              if (modelLower === 'vms' && (kt.includes('v300') || kt.includes('v310'))) return false;
              if (kt === 'vms' && (modelLower.includes('v300') || modelLower.includes('v310'))) return false;
              
              return kt.includes(modelLower) || modelLower.includes(kt);
            });
          });
        });
        
        console.log(`✅ ${partialMatch.length} kits trouvés avec recherche partielle`);
        return partialMatch;
      }
      
      return kits;
      
    } catch (error) {
      console.error('❌ Erreur chargement kits par modèles:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ RETURN ICI (avec les 3 fonctions exportées)
  const deleteMaintenanceKit = useCallback(async (id: string) => {
    await api.entities.maintenance_kits.delete(id);
  }, []);

  const updateMaintenanceKit = useCallback(async (id: string, data: any) => {
    await api.entities.maintenance_kits.update(id, data);
  }, []);

  return { 
    maintenanceKits, 
    loading, 
    fetchMaintenanceKits, 
    getKitsByMachineType,
    getKitsByMachineModels,
    deleteMaintenanceKit,
    updateMaintenanceKit
  };
}
