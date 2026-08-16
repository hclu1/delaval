import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {Languages, Download, Upload, Save, Plus, Search} from 'lucide-react';
import { api } from '../../lib/api';
import { useLanguages } from '../../hooks/useLanguages';

interface Translation {
  _id?: string;
  key: string;
  languageCode: string;
  value: string;
  context: string;
  lastModified?: string;
  modifiedBy?: string;
}

interface TranslationEditorScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
}

export function TranslationEditorScreen({ onNavigate }: TranslationEditorScreenProps) {
  const { languages } = useLanguages();
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [filteredTranslations, setFilteredTranslations] = useState<Translation[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('fr');
  const [selectedContext, setSelectedContext] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const contexts = ['Dashboard', 'Clients', 'Machines', 'Interventions', 'Spare Parts', 'Users', 'Administration', 'Common'];

  const fetchTranslations = async () => {
    setLoading(true);
    try {
      const { list } = await api.entities.translations.list({
        filter: { languageCode: selectedLanguage },
        sort: { key: 1 }
      });
      setTranslations(list || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslations();
  }, [selectedLanguage]);

  useEffect(() => {
    let filtered = translations;

    if (selectedContext !== 'all') {
      filtered = filtered.filter(t => t.context === selectedContext);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.key.toLowerCase().includes(query) || 
        t.value.toLowerCase().includes(query)
      );
    }

    setFilteredTranslations(filtered);
  }, [translations, selectedContext, searchQuery]);

  const handleEdit = (translation: Translation) => {
    setEditingId(translation._id || null);
    setEditValue(translation.value);
  };

  const handleSave = async (id: string) => {
    try {
      const now = new Date().toISOString();
      await api.entities.translations.update(
        { _id: id },
        { 
          value: editValue, 
          lastModified: now, 
          modifiedBy: 'admin',
          updatedAt: now
        }
      );
      setEditingId(null);
      await fetchTranslations();
    } catch (error) {
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Key', 'Value', 'Context'],
      ...filteredTranslations.map(t => [t.key, t.value, t.context])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations_${selectedLanguage}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Languages className="text-blue-600" size={32} />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Éditeur de traductions</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Gérez les traductions de l'application</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download size={18} className="mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Select
            label="Langue"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            {languages.filter(l => l.isActive).map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.code.toUpperCase()})
              </option>
            ))}
          </Select>

          <Select
            label="Contexte"
            value={selectedContext}
            onChange={(e) => setSelectedContext(e.target.value)}
          >
            <option value="all">Tous les contextes</option>
            {contexts.map(ctx => (
              <option key={ctx} value={ctx}>{ctx}</option>
            ))}
          </Select>

          <div className="relative">
            <Input
              label="Rechercher"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Clé ou valeur..."
            />
            <Search size={18} className="absolute right-3 top-9 text-gray-400" />
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          {filteredTranslations.length} traduction(s) trouvée(s)
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clé</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valeur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contexte</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTranslations.map((translation) => (
                <tr key={translation._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">{translation.key}</td>
                  <td className="px-4 py-3 text-sm">
                    {editingId === translation._id ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        autoFocus
                      />
                    ) : (
                      <span className="text-gray-900">{translation.value}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {translation.context}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {editingId === translation._id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleSave(translation._id!)}>
                          <Save size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(translation)}>
                        Modifier
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
