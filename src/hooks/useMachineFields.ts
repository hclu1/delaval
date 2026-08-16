import { useState } from 'react'
import { api } from '../lib/api'

export function useMachineFields() {
  const [machineFields, setMachineFields] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMachineFields = async () => {
    setLoading(true)
    try {
      const { list } = await api.entities.machine_fields.list({
        sort: { order: 1 }
      })
      setMachineFields(list)
      console.log('Champs machines chargés:', list)
    } catch (error) {
      console.error('Erreur chargement champs machines:', error)
    } finally {
      setLoading(false)
    }
  }

  const createMachineField = async (fieldData: any) => {
    try {
      const newField = await api.entities.machine_fields.create(fieldData)
      console.log('Champ machine créé:', newField)
      await fetchMachineFields()
      return newField
    } catch (error) {
      console.error('Erreur création champ machine:', error)
      throw error
    }
  }

  const deleteMachineField = async (id: string) => {
    try {
      await api.entities.machine_fields.delete(id)
      console.log('Champ machine supprimé:', id)
      await fetchMachineFields()
    } catch (error) {
      console.error('Erreur suppression champ machine:', error)
      throw error
    }
  }

  return {
    machineFields,
    loading,
    fetchMachineFields,
    createMachineField,
    deleteMachineField
  }
}
