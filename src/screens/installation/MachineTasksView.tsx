// MachineTasksView.tsx
// Vue de saisie des tâches pour UNE machine
// Le technicien voit TOUTES les tâches de tous les techniciens
// Mais ne peut modifier QUE les siennes

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ArrowLeft, Plus, Clock, CheckCircle, Edit2, Trash2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TÂCHES OBLIGATOIRES
// ═══════════════════════════════════════════════════════════════
const TACHES_OBLIGATOIRES = [
  { id: 'oblig_electricite_generale', description: 'Électricité générale', obligatoire: true },
  { id: 'oblig_plomberie_generale', description: 'Plomberie générale', obligatoire: true },
  { id: 'oblig_electricite_machine', description: 'Électricité machine', obligatoire: true },
  { id: 'oblig_plomberie_machine', description: 'Plomberie machine', obligatoire: true },
  { id: 'oblig_frigoriste', description: 'Frigoriste', obligatoire: true },
  { id: 'oblig_monteur_machine', description: 'Monteur machine', obligatoire: true },
  { id: 'oblig_tuyauterie_inox', description: 'Tuyauterie inox', obligatoire: true },
  { id: 'oblig_prt', description: 'PRT', obligatoire: true },
  { id: 'oblig_vis', description: 'Vis', obligatoire: true },
  { id: 'oblig_circulation', description: 'Circulation', obligatoire: true },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const genId = (): string => Date.now().toString(36) + Math.random().toString(36).substr(2);

const formatHeures = (heures: number) => {
  const h = Math.floor(heures);
  const m = Math.round((heures - h) * 60);
  return m > 0 ? `${h}h ${m.toString().padStart(2, '0')}min` : `${h}h 00min`;
};

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════
interface MachineTasksViewProps {
  machine: any;
  currentUser: any;
  installationData: any;
  onBack: () => void;
  onSave: (updatedMachine: any) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export function MachineTasksView({
  machine,
  currentUser,
  installationData,
  onBack,
  onSave
}: MachineTasksViewProps) {

  // ── STATE & REFS ─────────────────────────────────────────────
  const [localMachine, setLocalMachine] = useState(machine);
  const [editingTacheId, setEditingTacheId] = useState<string | null>(null);
  const [heuresValue, setHeuresValue] = useState<string>('');
  const [showAddTache, setShowAddTache] = useState(false);
  const [nouvelleTacheDesc, setNouvelleTacheDesc] = useState('');

  const localMachineRef = useRef<any>(machine);
  const isSavingRef = useRef<boolean>(false);
  // Ref pour déclencher onSave après création technicien sans appeler onSave pendant le rendu
  const pendingSaveRef = useRef<any>(null);

  // ── SYNC REF avec state ───────────────────────────────────────
  useEffect(() => {
    localMachineRef.current = localMachine;
  }, [localMachine]);

  // ── SYNC depuis le parent (autres techniciens via polling) ────
  useEffect(() => {
    if (isSavingRef.current) return;
    if (!currentUser?._id) return;

    const othersIncoming = (machine.heuresParTechnicien || [])
      .filter((t: any) => t.technicienId !== currentUser._id);
    const othersCurrent = (localMachineRef.current.heuresParTechnicien || [])
      .filter((t: any) => t.technicienId !== currentUser._id);

    if (JSON.stringify(othersIncoming) !== JSON.stringify(othersCurrent)) {
      const myTech = (localMachineRef.current.heuresParTechnicien || [])
        .find((t: any) => t.technicienId === currentUser._id);
      const merged = [
        ...(myTech ? [myTech] : []),
        ...othersIncoming
      ];
      const updated = { ...machine, heuresParTechnicien: merged };
      localMachineRef.current = updated;
      setLocalMachine(updated);
    }
  }, [machine]);

  // ── CRÉER LE TECHNICIEN si absent (jamais pendant le rendu) ──
  useEffect(() => {
    if (!currentUser?._id) return;
    const heuresParTech = localMachineRef.current.heuresParTechnicien || [];
    const existe = heuresParTech.find((t: any) => t.technicienId === currentUser._id);
    if (existe) return;

    const newTech = {
      technicienId: currentUser._id,
      technicienNom: `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim(),
      specialite: currentUser.role || 'Technicien',
      taches: TACHES_OBLIGATOIRES.map(t => ({
        id: t.id,
        description: t.description,
        heures: 0,
        obligatoire: true,
        dateCreation: new Date().toISOString(),
        dateDerniereModification: new Date().toISOString()
      }))
    };

    const updated = {
      ...localMachineRef.current,
      heuresParTechnicien: [...heuresParTech, newTech]
    };
    localMachineRef.current = updated;
    pendingSaveRef.current = updated; // marquer pour sauvegarde
    setLocalMachine(updated);
  }, [currentUser?._id]);

  // ── SAUVEGARDER après création technicien (useEffect séparé) ─
  // Safari iOS interdit onSave pendant le rendu ou dans le même useEffect que setState
  useEffect(() => {
    if (!pendingSaveRef.current) return;
    const toSave = pendingSaveRef.current;
    pendingSaveRef.current = null;
    onSave(toSave);
  }, [localMachine.heuresParTechnicien?.length]);

  // ── DÉRIVÉS ──────────────────────────────────────────────────
  const isTerminee = installationData.statut === 'TERMINEE';

  const techActuel = currentUser
    ? (localMachine.heuresParTechnicien || []).find(
        (t: any) => t.technicienId === currentUser._id
      ) || null
    : null;

  const calculerTotalTechnicien = (tech: any) =>
    (tech.taches || []).reduce((sum: number, t: any) => sum + (t.heures || 0), 0);

  const totalMachine = (localMachine.heuresParTechnicien || []).reduce(
    (sum: number, tech: any) => sum + calculerTotalTechnicien(tech),
    0
  );

  const totalTechActuel = techActuel ? calculerTotalTechnicien(techActuel) : 0;

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleEditHeures = (tacheId: string, currentHeures: number) => {
    setEditingTacheId(tacheId);
    setHeuresValue(currentHeures.toString());
  };

  const handleSaveHeures = (tacheId: string) => {
    const heures = parseFloat(heuresValue.replace(',', '.'));
    if (isNaN(heures) || heures < 0) {
      alert('❌ Valeur invalide');
      return;
    }

    const currentMachine = localMachineRef.current;
    const heuresParTech = currentMachine.heuresParTechnicien.map((t: any) => {
      if (t.technicienId === currentUser._id) {
        return {
          ...t,
          taches: t.taches.map((tache: any) =>
            tache.id === tacheId
              ? { ...tache, heures, dateDerniereModification: new Date().toISOString() }
              : tache
          )
        };
      }
      return t;
    });

    const updated = { ...currentMachine, heuresParTechnicien: heuresParTech, updatedAt: new Date().toISOString() };
    localMachineRef.current = updated;
    setLocalMachine(updated);
isSavingRef.current = true;
onSave(updated).finally(() => {
  isSavingRef.current = false;
});    setEditingTacheId(null);
    setHeuresValue('');
  };

  const handleAjouterTache = () => {
    if (!nouvelleTacheDesc.trim()) {
      alert('❌ Veuillez entrer une description');
      return;
    }

    const nouvelleTache = {
      id: genId(),
      description: nouvelleTacheDesc.trim(),
      heures: 0,
      obligatoire: false,
      dateCreation: new Date().toISOString(),
      dateDerniereModification: new Date().toISOString()
    };

    const currentMachine = localMachineRef.current;
    const heuresParTech = currentMachine.heuresParTechnicien.map((t: any) => {
      if (t.technicienId === currentUser._id) {
        return { ...t, taches: [...t.taches, nouvelleTache] };
      }
      return t;
    });

    const updated = { ...currentMachine, heuresParTechnicien: heuresParTech, updatedAt: new Date().toISOString() };
    localMachineRef.current = updated;
    setLocalMachine(updated);
   isSavingRef.current = true;
onSave(updated).finally(() => {
  isSavingRef.current = false;
});
setNouvelleTacheDesc('');
setShowAddTache(false);
  };

  const handleSupprimerTache = (tacheId: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;

    const currentMachine = localMachineRef.current;
    const heuresParTech = currentMachine.heuresParTechnicien.map((t: any) => {
      if (t.technicienId === currentUser._id) {
        return { ...t, taches: t.taches.filter((tache: any) => tache.id !== tacheId) };
      }
      return t;
    });

    const updated = { ...currentMachine, heuresParTechnicien: heuresParTech, updatedAt: new Date().toISOString() };
    localMachineRef.current = updated;
    setLocalMachine(updated);
   isSavingRef.current = true;
onSave(updated).finally(() => {
  isSavingRef.current = false;
});
  };

  const handleValider = () => {
    onBack();
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════

  if (!currentUser || !techActuel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Chargement du technicien...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-2">
            <ArrowLeft size={20} />
            <span className="text-sm">Retour aux machines</span>
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">🏭 {localMachine.nom}</h1>
              <p className="text-sm text-gray-600">
                {localMachine.typeMachineNom} {localMachine.serie && `• N° ${localMachine.serie}`}
              </p>
            </div>
            <span className={`px-3 py-1 text-xs font-bold rounded ${
              localMachine.relationType === 'MAITRE'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {localMachine.relationType}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Info Technicien */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 uppercase font-semibold mb-1">Connecté en tant que</p>
              <p className="text-lg font-bold text-blue-900">{techActuel.technicienNom}</p>
              <p className="text-sm text-blue-700">{techActuel.specialite}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600 uppercase font-semibold mb-1">Vos heures</p>
              <p className="text-2xl font-bold text-blue-900">{formatHeures(totalTechActuel)}</p>
            </div>
          </div>
        </Card>

        {/* Total Machine */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Total machine :</span>
            <span className="text-lg font-bold text-gray-900">{formatHeures(totalMachine)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {(localMachine.heuresParTechnicien || []).length} technicien(s) sur cette machine
          </p>
        </Card>

        {/* VOS TÂCHES */}
        <Card>
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            ✏️ Vos tâches
          </h2>

          <div className="space-y-3">
            {techActuel.taches.map((tache: any) => (
              <div
                key={tache.id}
                className={`p-3 rounded-lg border ${
                  tache.heures > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {tache.heures > 0 && <CheckCircle size={16} className="text-green-600" />}
                      <span className={`font-medium ${tache.heures > 0 ? 'text-green-900' : 'text-gray-700'}`}>
                        {tache.description}
                      </span>
                      {tache.obligatoire && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Obligatoire
                        </span>
                      )}
                    </div>

                    {editingTacheId === tache.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={heuresValue}
                          onChange={(e) => setHeuresValue(e.target.value)}
                          autoFocus
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Heures"
                        />
                        <span className="text-sm text-gray-600">heures</span>
                        <Button
                          onClick={() => handleSaveHeures(tache.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
                        >
                          ✓ OK
                        </Button>
                        <Button
                          onClick={() => setEditingTacheId(null)}
                          variant="secondary"
                          className="px-3 py-1 text-sm"
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-lg font-bold ${tache.heures > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                          {formatHeures(tache.heures || 0)}
                        </span>
                        {!isTerminee && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditHeures(tache.id, tache.heures || 0);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                          >
                            <Edit2 size={14} /> Modifier
                          </button>
                        )}
                        {!isTerminee && !tache.obligatoire && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSupprimerTache(tache.id);
                            }}
                            className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                          >
                            <Trash2 size={14} /> Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ajouter tâche personnalisée */}
          {!isTerminee && (
            <div className="mt-4">
              {showAddTache ? (
                <div className="p-3 border border-blue-300 rounded-lg bg-blue-50">
                  <input
                    type="text"
                    value={nouvelleTacheDesc}
                    onChange={(e) => setNouvelleTacheDesc(e.target.value)}
                    placeholder="Description de la tâche..."
                    className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAjouterTache()}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAjouterTache}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                    >
                      Ajouter
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddTache(false);
                        setNouvelleTacheDesc('');
                      }}
                      variant="secondary"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddTache(true);
                  }}
                  variant="secondary"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Ajouter une tâche personnalisée
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* AUTRES TECHNICIENS */}
        {(localMachine.heuresParTechnicien || [])
          .filter((t: any) => t.technicienId !== currentUser._id)
          .map((tech: any) => {
            const totalTech = calculerTotalTechnicien(tech);
            if (totalTech === 0) return null;

            return (
              <Card key={tech.technicienId} className="bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{tech.technicienNom}</p>
                    <p className="text-xs text-gray-600">{tech.specialite}</p>
                  </div>
                  <span className="text-lg font-bold text-gray-700">{formatHeures(totalTech)}</span>
                </div>
                <div className="space-y-2">
                  {tech.taches
                    .filter((t: any) => t.heures > 0)
                    .map((tache: any) => (
                      <div key={tache.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{tache.description}</span>
                        <span className="font-semibold text-gray-900">{formatHeures(tache.heures)}</span>
                      </div>
                    ))}
                </div>
              </Card>
            );
          })}
      </div>

      {/* Bouton Valider */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-xl mx-auto">
          <Button
            onClick={handleValider}
            className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} /> Valider et retour
          </Button>
        </div>
      </div>
    </div>
  );
}