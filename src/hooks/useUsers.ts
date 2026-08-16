//useUsers.ts
import { useState } from 'react'
import { api } from '../lib/api'
// Permissions par défaut selon le rôle
const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  'ADMINISTRATEUR': [
    'view_clients', 'edit_clients',
    'view_machines', 'edit_machines',
    'view_interventions', 'create_interventions', 'edit_interventions',
    'view_spare_parts', 'edit_spare_parts',
    'view_users', 'edit_users',
    'admin_access'
  ],
  'DIRECTEUR': [
    'view_clients', 'edit_clients',
    'view_machines', 'edit_machines',
    'view_interventions', 'create_interventions', 'edit_interventions',
    'view_spare_parts', 'edit_spare_parts',
    'view_users'
  ],
  'RESPONSABLE_TECHNIQUE': [
    'view_clients', 'edit_clients',
    'view_machines', 'edit_machines',
    'view_interventions', 'create_interventions', 'edit_interventions',
    'view_spare_parts', 'edit_spare_parts',
    'view_users'
  ],
  'RESPONSABLE': [
    'view_clients',
    'view_machines',
    'view_interventions', 'create_interventions', 'edit_interventions',
    'view_spare_parts'
  ],
  'CHEF_TECHNICIEN_CMS': [
    'view_clients',
    'view_machines',
    'view_interventions', 'create_interventions', 'edit_interventions',
    'view_spare_parts'
  ],
  'CHEF_TECHNICIEN_VMS': [
    'view_clients',
    'view_machines',
    'view_interventions', 'create_interventions', 'edit_interventions',
    'view_spare_parts'
  ],
  'TECHNICIEN_CMS': [
    'view_clients',
    'view_machines',
    'view_interventions', 'create_interventions',
    'view_spare_parts'
  ],
  'TECHNICIEN_VMS': [
    'view_clients',
    'view_machines',
    'view_interventions', 'create_interventions',
    'view_spare_parts'
  ],
  'CHEF_MONTEUR': [
    'view_machines',
    'view_interventions', 'create_interventions',
    'view_spare_parts'
  ],
  'MONTEUR': [
    'view_machines',
    'view_interventions',
    'view_spare_parts'
  ],
  'MAGASINIER': [
    'view_spare_parts', 'edit_spare_parts'
  ],
  'CLIENT': [
    'view_machines',
    'view_interventions'
  ]
};

export function useUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchUsers = async (options?: {
    filter?: Record<string, any>
    sort?: Record<string, 1 | -1>
    limit?: number
    skip?: number
  }) => {
    setLoading(true)
    try {
      const { list, total } = await api.entities.utilisateurs.list({
        filter: options?.filter || { actif: true },
        sort: options?.sort || { nom: 1 },
        limit: options?.limit,
        skip: options?.skip
      })
      setUsers(list)
      setTotal(total)
      console.log('Utilisateurs chargés:', list)
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const createUser = async (userData: any) => {
    try {
      const newUser = await api.entities.utilisateurs.create(userData)
      console.log('Utilisateur créé:', newUser)
      await fetchUsers()
      return newUser
    } catch (error) {
      console.error('Erreur création utilisateur:', error)
      throw error
    }
  }

  const updateUser = async (id: string, updates: any) => {
    if (typeof id !== 'string') {
      throw new Error('ID doit être une chaîne')
    }
    try {
      const updated = await api.entities.utilisateurs.update(id, updates)
      console.log('Utilisateur mis à jour:', updated)
      await fetchUsers()
      return updated
    } catch (error) {
      console.error('Erreur mise à jour utilisateur:', error)
      throw error
    }
  }

  const deleteUser = async (id: string) => {
    if (typeof id !== 'string') {
      throw new Error('ID invalide')
    }
    try {
      await api.entities.utilisateurs.delete(id)
      console.log('Utilisateur supprimé:', id)
      await fetchUsers()
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error)
      throw error
    }
  }

  return { 
    users, 
    total, 
    loading, 
    fetchUsers, 
    createUser, 
    updateUser, 
    deleteUser 
  }
}
