import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface Translation {
  _id?: string;
  key: string;
  languageCode: string;
  value: string;
  context: string;
  lastModified?: string;
  modifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'soplan_language';
const DEFAULT_LANGUAGE = 'fr';

const DEFAULT_TRANSLATIONS: Record<string, string> = {
  'clients.title': 'Clients',
  'interventions.title': 'Interventions',
  'spare_parts.title': 'Pièces Détachées',
  'maintenance.title': 'Maintenance',
  'troubleshooting.title': 'Dépannage',
  'users.title': 'Utilisateurs',
  'administration.title': 'Administration',
  'maintenance.monitoring': 'Surveillance'
};

export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
  });
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [missingKeys, setMissingKeys] = useState<Set<string>>(new Set());

  const loadTranslations = async (langCode: string) => {
    setLoading(true);
    try {
      const { list } = await api.entities.translations.list({
        filter: { languageCode: langCode }
      });
      
      const translationMap: Record<string, string> = {};
      (list || []).forEach((t: Translation) => {
        translationMap[t.key] = t.value;
      });
      
      setTranslations(translationMap);
    } catch (error) {
      console.error('Erreur lors du chargement des traductions:', error);
    } finally {
      setLoading(false);
    }
  };

  const t = (key: string, fallback?: string): string => {
    if (translations[key]) {
      return translations[key];
    }
    if (DEFAULT_TRANSLATIONS[key]) {
      return DEFAULT_TRANSLATIONS[key];
    }
    
    // Si pas trouvé, marquer comme manquant
    if (!missingKeys.has(key)) {
      setMissingKeys(prev => new Set([...prev, key]));
      console.warn(`⚠️ Traduction manquante pour la clé: ${key} (langue: ${currentLanguage})`);
    }
    
    return fallback || key;
  };

  const changeLanguage = async (langCode: string) => {
    setCurrentLanguage(langCode);
    localStorage.setItem(STORAGE_KEY, langCode);
    await loadTranslations(langCode);
  };

  const createTranslation = async (data: Omit<Translation, '_id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      await api.entities.translations.create({
        ...data,
        lastModified: now,
        modifiedBy: 'admin',
        creator: 'admin',
        createdAt: now,
        updatedAt: now
      });
      
      if (data.languageCode === currentLanguage) {
        await loadTranslations(currentLanguage);
      }
    } catch (error) {
      console.error('Erreur lors de la création de la traduction:', error);
      throw error;
    }
  };

  const updateTranslation = async (id: string, value: string, modifiedBy: string = 'admin') => {
    try {
      const now = new Date().toISOString();
      await api.entities.translations.update(
        { _id: id },
        { 
          value, 
          lastModified: now, 
          modifiedBy,
          updatedAt: now
        }
      );
      await loadTranslations(currentLanguage);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la traduction:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadTranslations(currentLanguage);
  }, [currentLanguage]);

  return {
    t,
    currentLanguage,
    changeLanguage,
    loading,
    missingKeys: Array.from(missingKeys),
    createTranslation,
    updateTranslation,
    loadTranslations
  };
}
