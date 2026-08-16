import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface Language {
  _id?: string;
  code: string;
  name: string;
  nativeName: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useLanguages() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLanguages = async () => {
    setLoading(true);
    try {
      const { list } = await api.entities.languages.list({
        sort: { name: 1 }
      });
      setLanguages(list || []);
    } catch (error) {
      console.error('Erreur lors du chargement des langues:', error);
    } finally {
      setLoading(false);
    }
  };

  const createLanguage = async (data: Omit<Language, '_id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      await api.entities.languages.create({
        ...data,
        creator: 'admin',
        createdAt: now,
        updatedAt: now
      });
      await fetchLanguages();
    } catch (error) {
      console.error('Erreur lors de la création de la langue:', error);
      throw error;
    }
  };

  const updateLanguage = async (id: string, data: Partial<Language>) => {
    try {
      await api.entities.languages.update(
        id,
        { ...data, updatedAt: new Date().toISOString() }
      );
      await fetchLanguages();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la langue:', error);
      throw error;
    }
  };

  const deleteLanguage = async (id: string) => {
    try {
      await api.entities.languages.delete(id);
      await fetchLanguages();
    } catch (error) {
      console.error('Erreur lors de la suppression de la langue:', error);
      throw error;
    }
  };

  const setDefaultLanguage = async (code: string) => {
    try {
      // Retirer le statut default de toutes les langues
      const allLanguages = await api.entities.languages.list({});
      for (const lang of allLanguages.list || []) {
        if (lang.isDefault) {
          await api.entities.languages.update(
            lang._id!,
            { isDefault: false, updatedAt: new Date().toISOString() }
          );
        }
      }
      
      // Définir la nouvelle langue par défaut
      const targetLang = allLanguages.list?.find(l => l.code === code);
      if (targetLang) {
        await api.entities.languages.update(
          targetLang._id!,
          { isDefault: true, isActive: true, updatedAt: new Date().toISOString() }
        );
      }
      
      await fetchLanguages();
    } catch (error) {
      console.error('Erreur lors de la définition de la langue par défaut:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  return {
    languages,
    loading,
    fetchLanguages,
    createLanguage,
    updateLanguage,
    deleteLanguage,
    setDefaultLanguage
  };
}
