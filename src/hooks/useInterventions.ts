//useInterventions.ts
import { useState } from 'react'
import { api } from '../lib/api'

export function useInterventions() {
  const [interventions, setInterventions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchInterventions = async (options?: {
    filter?: Record<string, any>
    sort?: Record<string, 1 | -1>
    limit?: number
    skip?: number
  }) => {
    setLoading(true)
    try {
      const { list, total } = await api.entities.interventions.list({
        filter: options?.filter,
        sort: options?.sort || { dateDebut: -1 },
        limit: options?.limit,
        skip: options?.skip
      })
      setInterventions(list)
      setTotal(total)
    } catch (error: any) {
      console.error('❌ Erreur chargement interventions:', error?.message || error)
      setInterventions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

 const createIntervention = async (interventionData: any) => {
  try {
    const newIntervention = await api.entities.interventions.create(interventionData)
    // Ajout immédiat en local sans recharger (la base n'a pas encore indexé)
    setInterventions(prev => [newIntervention, ...prev])
    setTotal(prev => prev + 1)
    return newIntervention
  } catch (error) {
    console.error('❌ Erreur création intervention:', error)
    throw error
  }
}


  const updateIntervention = async (id: string, updates: any) => {
    if (typeof id !== 'string') {
      throw new Error('ID doit être une chaîne')
    }
    try {
      const updated = await api.entities.interventions.update(id, updates)
      return updated
    } catch (error) {
      console.error('Erreur mise à jour intervention:', error)
      throw error
    }
  }

  const deleteIntervention = async (id: string) => {
// Protection contre un objet passé par erreur à la place d'une string
    if (typeof id !== 'string' || id === '[object Object]') {
      throw new Error('ID doit être une chaîne')    }
    try {
      await api.entities.interventions.delete(id)
      console.log('Intervention supprimée:', id)
      await fetchInterventions()
    } catch (error) {
      console.error('Erreur suppression intervention:', error)
      throw error
    }
  }

  return { 
    interventions, 
    total, 
    loading, 
    fetchInterventions, 
    createIntervention, 
    updateIntervention, 
    deleteIntervention 
  }
}
