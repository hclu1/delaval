//useSpareParts.ts
import { useState } from 'react'
import { api } from '../lib/api'

export function useSpareParts() {
  const [spareParts, setSpareParts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchSpareParts = async (options?: {
    filter?: Record<string, any>
    sort?: Record<string, 1 | -1>
    limit?: number
    skip?: number
  }) => {
    setLoading(true)
    try {
      const { list, total } = await api.entities.spare_parts.list({
        filter: options?.filter || { actif: true },
        sort: options?.sort || { reference: 1 },
        limit: options?.limit,
        skip: options?.skip
      })
      setSpareParts(list)
      setTotal(total)
      console.log('Pièces détachées chargées:', list)
    } catch (error) {
      console.error('Erreur chargement pièces:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStock = async (id: string, quantity: number) => {
    if (typeof id !== 'string') {
      throw new Error('ID doit être une chaîne')
    }
    if (typeof quantity !== 'number') {
      throw new Error('Quantité doit être un nombre')
    }
    try {
      const updated = await api.entities.spare_parts.update(id, { stock: quantity })
      console.log('Stock mis à jour:', updated)
      await fetchSpareParts()
      return updated
    } catch (error) {
      console.error('Erreur mise à jour stock:', error)
      throw error
    }
  }

  const deleteSparePart = async (id: string) => {
    if (typeof id !== 'string' || id === '[object Object]') {
      throw new Error('ID invalide: doit être une chaîne')
    }
    try {
      await api.entities.spare_parts.delete(id)
      console.log('Pièce supprimée:', id)
      await fetchSpareParts()
    } catch (error) {
      console.error('Erreur suppression pièce:', error)
      throw error
    }
  }

  return { 
    spareParts, 
    total, 
    loading, 
    fetchSpareParts, 
    updateStock,
    deleteSparePart
  }
}