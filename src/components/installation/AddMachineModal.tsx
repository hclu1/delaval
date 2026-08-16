// AddMachineModal.tsx - VERSION SIMPLIFIÉE
// Modal pour ajouter une machine au montage
// Liste déroulante unique avec toutes les machines + option "Créer nouvelle"

import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { X, Plus } from 'lucide-react';
import { api } from '../../lib/api';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const genId = (): string => Date.now().toString(36) + Math.random().toString(36).substr(2);

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════
interface AddMachineModalProps {
  clientId: string;
  allMachines: any[]; // Toutes les machines du client
  montageExistingMachines: any[]; // Machines déjà dans le montage
  onClose: () => void;
  onAdd: (machine: any) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export function AddMachineModal({
  clientId,
  allMachines,
  montageExistingMachines,
  onClose,
  onAdd
}: AddMachineModalProps) {

  // Sélection dans la liste
  const [selectedValue, setSelectedValue] = useState<string>('');
  
  // Formulaire nouvelle machine (affiché si selectedValue === '__nouvelle__')
  const [showNewMachineForm, setShowNewMachineForm] = useState(false);
  const [nom, setNom] = useState('');
  const [serie, setSerie] = useState('');
  const [notes, setNotes] = useState('');
  
  // Relation (toujours affiché)
  const [relationType, setRelationType] = useState('MAITRE');
  const [showNewRelationType, setShowNewRelationType] = useState(false);
  const [newRelationType, setNewRelationType] = useState('');
  
  // Champs de relation personnalisés
  const [relationFields, setRelationFields] = useState<Array<{ label: string; value: string }>>([]);
  const [showAddRelationField, setShowAddRelationField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  
  // Machines liées
  const [relatedMachines, setRelatedMachines] = useState<string[]>([]);
  
  // Loading
  const [isCreating, setIsCreating] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // TYPES DE RELATION PAR DÉFAUT
  // ═══════════════════════════════════════════════════════════════
const relationTypes = ['MAITRE', 'ESCLAVE', 'SOEUR', 'FRERE'];

const relationTypeMapping: Record<string, string> = {
  'MAITRE': 'MASTER',
  'ESCLAVE': 'SLAVE',
  'SOEUR': 'PARENT',
  'FRERE': 'CHILD'
};
  // ═══════════════════════════════════════════════════════════════
  // MACHINES DU CLIENT (non encore dans le montage)
  // ═══════════════════════════════════════════════════════════════
const availableMachines = allMachines.filter((m: any) => 
    String(m.clientId) === String(clientId) &&
    !montageExistingMachines.some((em: any) => em.machineId === m._id)
  );
  // ═══════════════════════════════════════════════════════════════
  // GESTION SÉLECTION LISTE
  // ═══════════════════════════════════════════════════════════════
  const handleSelectChange = (value: string) => {
    setSelectedValue(value);
    if (value === '__nouvelle__') {
      setShowNewMachineForm(true);
      setRelationType(montageExistingMachines.length === 0 ? 'MAITRE' : 'ESCLAVE');
    } else {
      setShowNewMachineForm(false);
      setRelationType(montageExistingMachines.length === 0 ? 'MAITRE' : 'ESCLAVE');
      // Pré-remplir le numéro de série si machine existante
      const machineDB = allMachines.find((m: any) => m._id === value);
      if (machineDB) {
        setSerie(machineDB.serie || '');
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // AJOUTER UN CHAMP DE RELATION
  // ═══════════════════════════════════════════════════════════════
  const handleAddRelationField = () => {
    if (!newFieldLabel.trim() || !newFieldValue.trim()) {
      alert('❌ Veuillez remplir le label et la valeur');
      return;
    }

    setRelationFields([...relationFields, {
      label: newFieldLabel.trim(),
      value: newFieldValue.trim()
    }]);
    setNewFieldLabel('');
    setNewFieldValue('');
    setShowAddRelationField(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // SUPPRIMER UN CHAMP DE RELATION
  // ═══════════════════════════════════════════════════════════════
  const handleRemoveRelationField = (index: number) => {
    setRelationFields(relationFields.filter((_, i) => i !== index));
  };

  // ═══════════════════════════════════════════════════════════════
  // AJOUTER TYPE DE RELATION CUSTOM
  // ═══════════════════════════════════════════════════════════════
  const handleAddNewRelationType = () => {
    if (!newRelationType.trim()) return;
    setRelationType(newRelationType.trim().toUpperCase());
    setShowNewRelationType(false);
    setNewRelationType('');
  };

  // ═══════════════════════════════════════════════════════════════
  // CRÉER / AJOUTER LA MACHINE
  // ═══════════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    if (!selectedValue) {
      alert('❌ Veuillez sélectionner une machine');
      return;
    }

    if (selectedValue === '__nouvelle__') {
      // ─── CRÉER UNE NOUVELLE MACHINE ───
      if (!nom.trim()) {
        alert('❌ Veuillez entrer un nom de machine');
        return;
      }

      setIsCreating(true);

      try {
        // Créer la machine dans la base
const now = new Date().toISOString();
const newMachineDB = await api.entities.machines.create({
  clientId: clientId,
  nom: nom.trim(),
  numeroSerie: serie.trim(),
  notes: notes.trim(),
  typeRelation: relationTypeMapping[relationType] || relationType,
  relationFields: relationFields,
  relatedMachines: relatedMachines,
  dateInstallation: now,
  compteur: 0,
  actif: true,
  createdAt: now,
  updatedAt: now
});        console.log('✅ Machine créée dans la base:', newMachineDB._id);

        // Créer l'objet machine pour le montage
        const machineMontage = {
          id: genId(),
          machineId: newMachineDB._id,
          nom: newMachineDB.nom,
          serie: newMachineDB.serie,
          relationType: newMachineDB.relationType,
          relationFields: newMachineDB.relationFields || [],
          relatedMachines: newMachineDB.relatedMachines || [],
          heuresParTechnicien: [] // Vide au début
        };

        onAdd(machineMontage);

      } catch (error) {
        console.error('❌ Erreur création machine:', error);
        alert('❌ Erreur lors de la création de la machine');
      } finally {
        setIsCreating(false);
      }

    } else {
      // ─── AJOUTER UNE MACHINE EXISTANTE ───
      const machineDB = allMachines.find((m: any) => m._id === selectedValue);
      if (!machineDB) return;

      setIsCreating(true);

      try {
        // Mettre à jour la machine dans la base avec le numéro de série et les relations
await api.entities.machines.update(machineDB._id, {
  numeroSerie: serie.trim(),
  typeRelation: relationTypeMapping[relationType] || relationType,
  relationFields: relationFields,
  relatedMachines: relatedMachines,
  updatedAt: new Date().toISOString()
});
        // Créer l'objet machine pour le montage
const machineMontage = {
          id: genId(),
          machineId: machineDB._id,
          nom: machineDB.nom,
          typeMachineNom: typeof machineDB.typeMachine === 'object'
            ? machineDB.typeMachine?.nom || 'Type inconnu'
            : machineDB.typeMachine || 'Type inconnu',
          serie: serie.trim() || machineDB.serie || '',
          relationType: relationType,          relationFields: relationFields,
          relatedMachines: relatedMachines,
          heuresParTechnicien: [] // Vide au début
        };

        onAdd(machineMontage);

      } catch (error) {
        console.error('❌ Erreur ajout machine:', error);
        alert('❌ Erreur lors de l\'ajout de la machine');
      } finally {
        setIsCreating(false);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">🏭 Ajouter une machine</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* LISTE DÉROULANTE UNIQUE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choisir une machine *
            </label>
            <select
              value={selectedValue}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
            >
              <option value="">-- Sélectionner une machine --</option>
              
              {/* Machines existantes */}
              {availableMachines.length > 0 && (
                <optgroup label="Machines existantes">
                  {availableMachines.map((m: any) => (
                    <option key={m._id} value={m._id}>
                      {m.nom} {m.serie && `(N° ${m.serie})`}
                    </option>
                  ))}
                </optgroup>
              )}
              
              {/* Créer nouvelle */}
              <optgroup label="─────────────">
                <option value="__nouvelle__">➕ Créer une nouvelle machine</option>
              </optgroup>
            </select>
          </div>

          {/* NUMÉRO DE SÉRIE (visible si machine sélectionnée) */}
          {selectedValue && selectedValue !== '__nouvelle__' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                N° Série
              </label>
              <input
                type="text"
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                placeholder="Ex: ABC123"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Vous pouvez modifier ou ajouter le numéro de série
              </p>
            </div>
          )}

          {/* FORMULAIRE NOUVELLE MACHINE */}
          {showNewMachineForm && (
            <div className="p-4 border border-blue-300 rounded-lg bg-blue-50 space-y-4">
              <p className="text-sm font-semibold text-blue-900">📝 Nouvelle machine</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la machine *
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Machine à café V300"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  N° Série
                </label>
                <input
                  type="text"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="Ex: ABC123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informations complémentaires..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>
          )}

          {/* TYPE DE RELATION (toujours visible si une machine est sélectionnée) */}
          {selectedValue && (
            <>
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de relation
                </label>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {relationTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setRelationType(type)}
                      className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                        relationType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowNewRelationType(true)}
                    className="px-3 py-1 rounded-lg text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1"
                  >
                    <Plus size={14} /> Autre
                  </button>
                </div>

                {showNewRelationType && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newRelationType}
                      onChange={(e) => setNewRelationType(e.target.value)}
                      placeholder="Ex: PARALLELE"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewRelationType()}
                    />
                    <Button onClick={handleAddNewRelationType} className="px-4 py-2 text-sm">
                      Ajouter
                    </Button>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  💡 <strong>Conseil :</strong> La première machine est généralement MAITRE, les suivantes ESCLAVE
                </p>
              </div>

              {/* CHAMPS DE RELATION PERSONNALISÉS */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Informations de relation (optionnel)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Exemple : "Parent de" → "Chauffe-eau", "Connecté à" → "Tank 2"
                </p>
                
                {relationFields.map((field, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-600 w-32">{field.label} :</span>
                    <span className="text-sm text-gray-900 flex-1">{field.value}</span>
                    <button
                      onClick={() => handleRemoveRelationField(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                {showAddRelationField ? (
                  <div className="p-3 border border-blue-300 rounded-lg bg-blue-50 space-y-2">
                    <input
                      type="text"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      placeholder="Label (ex: Parent de, Connecté à)"
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <input
                      type="text"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      placeholder="Valeur (ex: Chauffe-eau, Tank 2)"
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleAddRelationField} className="flex-1">
                        Ajouter
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddRelationField(false);
                          setNewFieldLabel('');
                          setNewFieldValue('');
                        }}
                        variant="secondary"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowAddRelationField(true)}
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2 mt-2"
                  >
                    <Plus size={16} /> Ajouter un champ de relation
                  </Button>
                )}
              </div>

              {/* MACHINES LIÉES */}
              {montageExistingMachines.length > 0 && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Machines liées (optionnel)
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Sélectionnez les machines avec lesquelles celle-ci est connectée
                  </p>
                  <div className="space-y-2">
                    {montageExistingMachines.map((m: any) => (
                      <label key={m.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={relatedMachines.includes(m.machineId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRelatedMachines([...relatedMachines, m.machineId]);
                            } else {
                              setRelatedMachines(relatedMachines.filter(id => id !== m.machineId));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{m.nom}</span>
                        <span className="text-xs text-gray-500">({m.relationType})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || !selectedValue || (showNewMachineForm && !nom.trim())}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
          >
            {isCreating ? '⏳ Ajout en cours...' : '✓ Ajouter la machine'}
          </Button>
        </div>
      </div>
    </div>
  );
}
