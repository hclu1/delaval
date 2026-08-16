//useClients.ts
import { useState } from 'react'
import { api } from '../lib/api'

export function useClients() {
  const [clients, setClients] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchClients = async (options?: {
    filter?: Record<string, any>
    sort?: Record<string, 1 | -1>
    limit?: number
    skip?: number
  }) => {
    setLoading(true)
    try {
      const { list, total } = await api.entities.clients.list({
        filter: options?.filter || {},
        sort: options?.sort || { createdAt: -1 },
        limit: options?.limit,
        skip: options?.skip
      })
      setClients(list)
      setTotal(total)
    } catch (error) {
      console.error('Erreur chargement clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const createClient = async (clientData: any) => {
    try {
      const newClient = await api.entities.clients.create(clientData)
      await fetchClients()
      return newClient
    } catch (error) {
      console.error('Erreur création client:', error)
      throw error
    }
  }

  const updateClient = async (id: string, updates: any) => {
    if (typeof id !== 'string') {
      throw new Error('ID doit être une chaîne')
    }
    try {
      const updated = await api.entities.clients.update(id, updates)
      await fetchClients()
      return updated
    } catch (error) {
      console.error('Erreur mise à jour client:', error)
      throw error
    }
  }

  const deleteClient = async (clientIdOrObject: string | any) => {
    try {
      // Extraire l'ID si c'est un objet, sinon utiliser directement la string
      let clientId: string;
      
      if (typeof clientIdOrObject === 'string') {
        clientId = clientIdOrObject;
      } else if (clientIdOrObject && typeof clientIdOrObject === 'object' && clientIdOrObject._id) {
        clientId = clientIdOrObject._id;
      } else {
        console.error('❌ Paramètre invalide pour deleteClient:', clientIdOrObject);
        throw new Error('ID invalide: doit être une chaîne ou un objet avec _id');
      }

      if (!clientId || typeof clientId !== 'string' || clientId === '[object Object]') {
        console.error('❌ ID extrait invalide:', clientId);
        throw new Error('ID invalide: doit être une chaîne valide');
      }

      await api.entities.clients.delete(clientId);
      await fetchClients();
    } catch (error) {
      console.error('❌ Erreur suppression client:', error);
      throw error;
    }
  }

  // ✅ CORRECTION : Utiliser list() au lieu de retrieve()
  const getClientById = async (id: string) => {
    try {
      const result = await api.entities.clients.list({ 
        filter: { _id: id },
        limit: 1 
      });
      
      const client = result.list[0];
      
      if (!client) return null;
      
      return client;
    } catch (error) {
      console.error('❌ Erreur récupération client:', error);
      throw error;
    }
  }

  return { 
    clients, 
    total, 
    loading, 
    fetchClients, 
    createClient, 
    updateClient, 
    deleteClient,
    getClientById
  }
}