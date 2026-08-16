import { useState } from 'react'
import { api } from '../lib/api'

export function useClientMessages() {
  const [messages, setMessages] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchMessages = async (options?: {
    filter?: Record<string, any>
    sort?: Record<string, 1 | -1>
    limit?: number
    skip?: number
  }) => {
    setLoading(true)
    try {
      const result = await api.entities.clientmessages.list({
        filter: options?.filter || {},
        sort: options?.sort || { dateEnvoi: -1 },
        limit: options?.limit,
        skip: options?.skip
      })
      const list = Array.isArray(result) ? result : (result?.list || [])
      const total = Array.isArray(result) ? result.length : (result?.total || 0)
      setMessages(list)
      setTotal(total)
      console.log('Messages chargés:', list)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('Erreur chargement messages:', errorMessage, error)
      setMessages([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const createMessage = async (messageData: any) => {
    try {
      const newMessage = await api.entities.clientmessages.create({
        ...messageData,
        dateEnvoi: new Date().toISOString(),
        estLu: false
      })
      console.log('Message créé:', newMessage)
      await fetchMessages()
      return newMessage
    } catch (error) {
      console.error('Erreur création message:', error)
      throw error
    }
  }

  const markAsRead = async (messageId: string) => {
    if (typeof messageId !== 'string') {
      throw new Error('ID doit être une chaîne')
    }
    try {
      const currentUser = api.auth.user
      const updated = await api.entities.clientmessages.update(messageId, {
        estLu: true,
        dateLecture: new Date().toISOString(),
        technicienId: currentUser?._id || 'unknown',
        technicienName: currentUser?.name || 'Technicien'
      })
      console.log('Message marqué comme lu:', updated)
      await fetchMessages()
      return updated
    } catch (error) {
      console.error('Erreur mise à jour message:', error)
      throw error
    }
  }

  const deleteMessage = async (id: string) => {
    if (typeof id !== 'string' || id === '[object Object]') {
      throw new Error('ID invalide: doit être une chaîne')
    }
    try {
      await api.entities.clientmessages.delete(id)
      console.log('Message supprimé:', id)
      await fetchMessages()
    } catch (error) {
      console.error('Erreur suppression message:', error)
      throw error
    }
  }

  // Compter les messages non lus pour un client
  const countUnreadMessages = async (clientId: string) => {
    if (!clientId) return 0
    try {
      const result = await api.entities.clientmessages.list({
        filter: { clientId, estLu: false }
      })
      const list = Array.isArray(result) ? result : (result?.list || [])
      return list.length
    } catch (error) {
      // Erreur réseau silencieuse - ne pas polluer la console
      return 0
    }
  }

  return { 
    messages, 
    total, 
    loading, 
    fetchMessages, 
    createMessage, 
    markAsRead, 
    deleteMessage,
    countUnreadMessages
  }
}
