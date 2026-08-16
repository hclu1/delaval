//useErrorCodes.ts
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface ErrorCode {
  _id: string;
  chapitre: string;
  titre: string;
  alarme: string;
  typeAlarme: string;
  cause: string;
  action: string;
  actif?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useErrorCodes() {
  const [errorCodes, setErrorCodes] = useState<ErrorCode[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchErrorCodes = async () => {
    try {
      setLoading(true);
      const result = await api.entities.error_codes.list({
        sort: { alarme: 1 }
      });
      setErrorCodes(result.list || []);
    } catch (error) {
      console.error('Erreur chargement codes erreur:', error);
      setErrorCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const searchErrorCodes = async (searchTerm: string): Promise<ErrorCode[]> => {
    if (!searchTerm || searchTerm.trim() === '') {
      return errorCodes;
    }

    try {
      const term = searchTerm.toLowerCase();
      const filtered = errorCodes.filter(code => 
        code.alarme?.toLowerCase().includes(term) ||
        code.titre?.toLowerCase().includes(term) ||
        code.cause?.toLowerCase().includes(term) ||
        code.action?.toLowerCase().includes(term)
      );
      return filtered;
    } catch (error) {
      console.error('Erreur recherche codes erreur:', error);
      return [];
    }
  };

  const deleteErrorCode = async (id: string) => {
    try {
      await api.entities.error_codes.delete(id);
      await fetchErrorCodes();
    } catch (error) {
      console.error('Erreur suppression code erreur:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchErrorCodes();
  }, []);

  return {
    errorCodes,
    loading,
    fetchErrorCodes,
    searchErrorCodes,
    deleteErrorCode
  };
}
