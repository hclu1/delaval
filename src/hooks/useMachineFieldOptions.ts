import { useState } from 'react'
import { api } from '../lib/api'

export function useMachineFieldOptions() {
  const [machineFieldOptions, setMachineFieldOptions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMachineFieldOptions = async () => {
    setLoading(true)
    try {
      const { list } = await api.entities.machine_field_options.list({
        sort: { order: 1 }
      })
      setMachineFieldOptions(list)
      console.log('Options de champs chargées:', list)
    } catch (error) {
      console.error('Erreur chargement options de champs:', error)
    } finally {
      setLoading(false)
    }
  }

  const createMachineFieldOption = async (optionData: any) => {
    try {
      const newOption = await api.entities.machine_field_options.create(optionData)
      console.log('Option de champ créée:', newOption)
      await fetchMachineFieldOptions()
      return newOption
    } catch (error) {
      console.error('Erreur création option de champ:', error)
      throw error
    }
  }

  const deleteMachineFieldOption = async (id: string) => {
    try {
      await api.entities.machine_field_options.delete(id)
      console.log('Option de champ supprimée:', id)
      await fetchMachineFieldOptions()
    } catch (error) {
      console.error('Erreur suppression option de champ:', error)
      throw error
    }
  }

  return {
    machineFieldOptions,
    loading,
    fetchMachineFieldOptions,
    createMachineFieldOption,
    deleteMachineFieldOption
  }
}
