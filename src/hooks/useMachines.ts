//useMachines.ts
import { useState, useCallback } from 'react' // <<< On ajoute useCallback ici
import { api } from '../lib/api'

export function useMachines() {
  const [machines, setMachines] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchMachines = async (options?: {
    filter?: Record<string, any>
    sort?: Record<string, 1 | -1>
    limit?: number
    skip?: number
  }) => {
    setLoading(true)
    try {
      const { list, total } = await api.entities.machines.list({
        filter: options?.filter || {},
        sort: options?.sort || { createdAt: -1 },
        limit: options?.limit,
        skip: options?.skip
      })
      setMachines(list)
      setTotal(total)
    } catch (error) {
      console.error('Erreur chargement machines:', error)
    } finally {
      setLoading(false)
    }
  }

  const createMachine = async (machineData: any) => {
    if (!machineData.clientId) {
      throw new Error('ERREUR BLOQUANTE: clientId est obligatoire');
    }
    try {
      const newMachine = await api.entities.machines.create(machineData);
      await fetchMachines();
      return newMachine;
    } catch (error) {
      console.error('❌ Erreur création machine:', error);
      throw error;
    }
  }

  const updateMachine = async (id: string, updates: any) => {
    if (typeof id !== 'string') {
      throw new Error('ID doit être une chaîne')
    }
    try {
      const updated = await api.entities.machines.update(id, updates)
      await fetchMachines()
      return updated
    } catch (error) {
      console.error('Erreur mise à jour machine:', error)
      throw error
    }
  }

  const deleteMachine = async (id: string) => {
    if (typeof id !== 'string' || id === '[object Object]') {
      throw new Error('ID invalide: doit être une chaîne')
    }
    try {
      await api.entities.machines.delete(id)
      await fetchMachines()
    } catch (error) {
      console.error('Erreur suppression machine:', error)
      throw error
    }
  }

  // >>> LA SEULE VRAIE MODIFICATION EST ICI <<<
  // On enveloppe la fonction dans useCallback pour la "mémoriser"
  const getMachineById = useCallback(async (id: string) => {
    if (typeof id !== 'string') {
      throw new Error('ID doit être une chaîne')
    }
    try {
      const machine = await api.entities.machines.get(id);
      return machine;
    } catch (error) {
      console.error('Erreur récupération machine:', error)
      return null
    }
  }, []); // Le tableau vide [] signifie que cette fonction ne dépend de rien d'autre

  return {
    machines,
    total,
    loading,
    loadingMachines: loading,
    fetchMachines,
    createMachine,
    updateMachine,
    deleteMachine,
    getMachineById
  }
}