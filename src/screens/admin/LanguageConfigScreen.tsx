import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {Globe, Plus, Save, X, Check} from 'lucide-react';
import { useLanguages, Language } from '../../hooks/useLanguages';

interface LanguageConfigScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
}

export function LanguageConfigScreen({ onNavigate }: LanguageConfigScreenProps) {
  const { languages, loading, createLanguage, updateLanguage, setDefaultLanguage } = useLanguages();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Language>>({
    isActive: true,
    isDefault: false
  });

  const handleSubmit = async () => {
    if (!formData.code || !formData.name || !formData.nativeName) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await createLanguage(formData as Omit<Language, '_id' | 'createdAt' | 'updatedAt'>);
      setShowAddForm(false);
      setFormData({ isActive: true, isDefault: false });
    } catch (error) {
      alert('Erreur lors de la création de la langue');
    }
  };

  const handleToggleActive = async (lang: Language) => {
    try {
      await updateLanguage(lang._id!, { isActive: !lang.isActive });
    } catch (error) {
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleSetDefault = async (code: string) => {
    try {
      await setDefaultLanguage(code);
    } catch (error) {
      alert('Erreur lors de la définition de la langue par défaut');
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="text-blue-600" size={32} />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Configuration des langues</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Gérez les langues disponibles dans l'application</p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={18} className="mr-2" />
          Ajouter une langue
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Nouvelle langue</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              <X size={20} />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Code ISO (ex: fr, en, de)"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
              required
              maxLength={2}
            />
            <Input
              label="Nom en anglais"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Nom dans la langue native"
              value={formData.nativeName || ''}
              onChange={(e) => setFormData({ ...formData, nativeName: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive || false}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">Langue active</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save size={18} className="mr-2" />
              Enregistrer
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4">Langues disponibles ({languages.length})</h2>
        <div className="space-y-2">
          {languages.map((lang) => (
            <div
              key={lang._id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                  {lang.code.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{lang.nativeName}</div>
                  <div className="text-sm text-gray-600">{lang.name}</div>
                </div>
                {lang.isDefault && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                    Par défaut
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(lang)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    lang.isActive
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {lang.isActive ? 'Active' : 'Inactive'}
                </button>
                {!lang.isDefault && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSetDefault(lang.code)}
                  >
                    Définir par défaut
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
