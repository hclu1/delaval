import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { TextArea } from '../../components/common/TextArea';
import { DataTable } from '../../components/admin/DataTable';
import { CSVImporter } from '../../components/admin/CSVImporter';
import { MaintenanceKitImporter } from '../../components/admin/MaintenanceKitImporter';
import { Database, Upload, Plus, X, Save } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useUsers } from '../../hooks/useUsers';
import { useMachines } from '../../hooks/useMachines';
import { useSpareParts } from '../../hooks/useSpareParts';
import { useMaintenanceKits } from '../../hooks/useMaintenanceKits';
import { useErrorCodes } from '../../hooks/useErrorCodes';
import { useTachesEntretien } from '../../hooks/useTachesEntretien';
import { useMachineFields } from '../../hooks/useMachineFields';
import { useMachineFieldOptions } from '../../hooks/useMachineFieldOptions';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

interface DatabaseAdminScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
}

type TableType = 'clients' | 'users' | 'maintenance_kits' | 'spare_parts' | 'error_codes' | 'taches_entretien' | 'machine_fields' | 'machine_field_options' | 'connections';

export function DatabaseAdminScreen({ onNavigate }: DatabaseAdminScreenProps) {
  const [activeTable, setActiveTable] = useState<TableType>('clients');
  const [showImporter, setShowImporter] = useState(false);
  const [showKitImporter, setShowKitImporter] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // ── Contrôle d'accès à l'onglet Connexions ──────────────────────────────────
  // Seuls ADMINISTRATEUR et DIRECTEUR peuvent voir la base espion
  const { userData: authUserData } = useAuth();
  const canViewConnections = (() => {
    if (!authUserData) return false;
    const roles: string[] = authUserData.roles || (authUserData.role ? [authUserData.role] : []);
    return roles.some(r =>
      ['ADMIN', 'ADMINISTRATEUR', 'DIRECTEUR', 'RESPONSABLE_TECHNIQUE'].includes(r)
    );
  })();
  // ────────────────────────────────────────────────────────────────────────────

  const { machines, fetchMachines } = useMachines();
  const { clients, fetchClients, deleteClient } = useClients();
  const { users, fetchUsers } = useUsers();
  const { spareParts, total: sparePartsTotal, fetchSpareParts, deleteSparePart } = useSpareParts();
  const { maintenanceKits, fetchMaintenanceKits, deleteMaintenanceKit, updateMaintenanceKit } = useMaintenanceKits();
  const { errorCodes, fetchErrorCodes } = useErrorCodes();
  const { fetchTachesEntretien } = useTachesEntretien();
  const [tachesEntretien, setTachesEntretien] = useState<any[]>([]);
  const { machineFields, fetchMachineFields, deleteMachineField } = useMachineFields();
  const { machineFieldOptions, fetchMachineFieldOptions, deleteMachineFieldOption } = useMachineFieldOptions();

  // ── Suivi connexions ────────────────────────────────────────────────────────
  const [connections, setConnections] = useState<any[]>([]);
  // Mois affiché dans le calendrier (format "YYYY-MM"), par défaut = mois courant
  const [connectionMonth, setConnectionMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  /** Charge toutes les connexions du mois sélectionné */
  const fetchConnections = async (month?: string) => {
    const m = month || connectionMonth;
    try {
      const result = await api.entities.user_connections.list({
        filter: { date: { $gte: `${m}-01`, $lte: `${m}-31` } },
        sort: { date: 1 },
        limit: 500
      });
      setConnections(result.list || []);
    } catch (err) {
      console.warn('[DatabaseAdmin] Connexions non disponibles:', err);
      setConnections([]);
    }
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Helper centralisé pour recharger les tâches
  const reloadTaches = async () => {
    const data = await fetchTachesEntretien();
    setTachesEntretien(data || []);
  };

  useEffect(() => {
    fetchClients();
    fetchUsers();
    fetchSpareParts({ filter: {} });
    fetchMaintenanceKits();
    fetchErrorCodes();
    reloadTaches();
    fetchMachines();
    fetchMachineFields();
    fetchMachineFieldOptions();
    fetchConnections();
  }, []);

  // ─── Formulaires d'ajout ────────────────────────────────────────────────────
  const getAddForm = () => {
    switch (activeTable) {

      case 'clients':
        return (
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajouter un client</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}><X size={20} /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="N° Client" value={formData.numeroClient || ''} onChange={(e) => setFormData({...formData, numeroClient: e.target.value})} required />
              <Input label="Nom" value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} required />
              <Input label="Nom de ferme" value={formData.nomFerme || ''} onChange={(e) => setFormData({...formData, nomFerme: e.target.value})} />
              <Input label="Email" type="email" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <Input label="Téléphone" value={formData.telephone || ''} onChange={(e) => setFormData({...formData, telephone: e.target.value})} />
              <Input label="Ville" value={formData.ville || ''} onChange={(e) => setFormData({...formData, ville: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button onClick={handleAdd} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
            </div>
          </Card>
        );

      case 'users':
        return (
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajouter un utilisateur</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}><X size={20} /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nom" value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} required />
              <Input label="Prénom" value={formData.prenom || ''} onChange={(e) => setFormData({...formData, prenom: e.target.value})} required />
              <Input label="Email" type="email" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              <Select label="Rôle" value={formData.role || 'technician'} onChange={(e) => setFormData({...formData, role: e.target.value})}
                options={[
                  { value: 'admin', label: 'Administrateur' },
                  { value: 'technician', label: 'Technicien' },
                  { value: 'manager', label: 'Manager' }
                ]} required />
              <Input label="N° Technicien" value={formData.numeroTechnicien || ''} onChange={(e) => setFormData({...formData, numeroTechnicien: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button onClick={handleAdd} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
            </div>
          </Card>
        );

      case 'spare_parts':
        return (
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajouter une pièce détachée</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}><X size={20} /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Référence" value={formData.reference || ''} onChange={(e) => setFormData({...formData, reference: e.target.value})} required />
              <Input label="Désignation" value={formData.designation || ''} onChange={(e) => setFormData({...formData, designation: e.target.value})} required />
              <Input label="Stock" type="number" value={formData.stock || 0} onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})} />
              <Input label="Seuil d'alerte" type="number" value={formData.seuilAlerte || 5} onChange={(e) => setFormData({...formData, seuilAlerte: parseInt(e.target.value)})} />
              <Input label="Prix unitaire" type="number" step="0.01" value={formData.prixUnitaire || 0} onChange={(e) => setFormData({...formData, prixUnitaire: parseFloat(e.target.value)})} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button onClick={handleAdd} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
            </div>
          </Card>
        );

      case 'error_codes':
        return (
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajouter un code erreur</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}><X size={20} /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Alarme" value={formData.alarme || ''} onChange={(e) => setFormData({...formData, alarme: e.target.value})} required placeholder="Ex: 8.16.7.25" />
              <Input label="Type d'alarme" value={formData.typeAlarme || ''} onChange={(e) => setFormData({...formData, typeAlarme: e.target.value})} />
              <Input label="Chapitre" value={formData.chapitre || ''} onChange={(e) => setFormData({...formData, chapitre: e.target.value})} />
              <Input label="Titre" value={formData.titre || ''} onChange={(e) => setFormData({...formData, titre: e.target.value})} />
            </div>
            <div className="mt-3">
              <TextArea label="Cause" value={formData.cause || ''} onChange={(e) => setFormData({...formData, cause: e.target.value})} rows={2} />
            </div>
            <div className="mt-3">
              <TextArea label="Action" value={formData.action || ''} onChange={(e) => setFormData({...formData, action: e.target.value})} rows={2} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button onClick={handleAdd} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
            </div>
          </Card>
        );

      case 'maintenance_kits':
        return (
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajouter un kit d'entretien</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}><X size={20} /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nom du kit" value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} required placeholder="Ex: Kit VMS Service 1" />
              <Input label="Type de machine" value={formData.machineType || ''} onChange={(e) => setFormData({...formData, machineType: e.target.value})} required placeholder="Ex: VMS, V300" />
              <Input label="N° Kit" value={formData.kitNumber || ''} onChange={(e) => setFormData({...formData, kitNumber: e.target.value})} placeholder="Ex: K-VMS-001" />
              <Input label="Kit ID" value={formData.kitId || ''} onChange={(e) => setFormData({...formData, kitId: e.target.value})} placeholder="Ex: vms-s1" />
              <Input label="N° de service (1 à 12)" type="number" value={formData.serviceNumber || 1} onChange={(e) => setFormData({...formData, serviceNumber: parseInt(e.target.value)})} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button onClick={handleAdd} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
            </div>
          </Card>
        );

      case 'taches_entretien':
        return (
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajouter une tâche d'entretien</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}><X size={20} /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Kit parent *"
                value={formData.kitId || ''}
                onChange={(e) => setFormData({...formData, kitId: e.target.value})}
                options={[
                  { value: '', label: 'Sélectionner un kit' },
                  ...maintenanceKits.map(kit => ({
                    value: kit._id,
                    label: `${kit.nom} — S${kit.serviceNumber} (${kit.machineType})`
                  }))
                ]}
                required
              />
              <Input label="Section" value={formData.section || ''} onChange={(e) => setFormData({...formData, section: e.target.value})} placeholder="Ex: VIDANGE, FILTRES..." />
              <Input label="Description *" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} required placeholder="Ex: Vider le bac à huile" />
              <Input label="Module" value={formData.module || ''} onChange={(e) => setFormData({...formData, module: e.target.value})} placeholder="Ex: Moteur, Hydraulique..." />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence pièce</label>
                <input
                  type="text"
                  value={formData.refPiece || ''}
                  onChange={(e) => setFormData({...formData, refPiece: e.target.value})}
                  placeholder="Tapez pour rechercher..."
                  list="spare-parts-list-add"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <datalist id="spare-parts-list-add">
                  {spareParts.map((part: any) => (
                    <option key={part._id} value={part.reference} label={`${part.reference} — ${part.designation}`} />
                  ))}
                </datalist>
                {formData.refPiece && (() => {
                  const found = spareParts.find((p: any) => p.reference === formData.refPiece);
                  return found ? <p className="text-xs text-green-600 mt-1">✓ {found.designation}</p> : null;
                })()}
              </div>
              <Input label="Quantité" type="number" value={formData.quantite || ''} onChange={(e) => setFormData({...formData, quantite: parseInt(e.target.value)})} />
              <Input label="Ordre d'affichage" type="number" value={formData.ordre || 0} onChange={(e) => setFormData({...formData, ordre: parseInt(e.target.value)})} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button onClick={handleAdd} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
            </div>
          </Card>
        );

      case 'machine_fields':
        return (
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajouter un champ machine</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}><X size={20} /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Type de machine" value={formData.machineType || ''} onChange={(e) => setFormData({...formData, machineType: e.target.value})} required placeholder="Ex: VMS2014, V300" />
              <Input label="Libellé du champ" value={formData.label || ''} onChange={(e) => setFormData({...formData, label: e.target.value})} required />
              <Select label="Type de champ" value={formData.fieldType || 'text'} onChange={(e) => setFormData({...formData, fieldType: e.target.value})}
                options={[
                  { value: 'select', label: 'Menu déroulant' },
                  { value: 'text', label: 'Texte libre' },
                  { value: 'number', label: 'Nombre' },
                  { value: 'date', label: 'Date' },
                  { value: 'checkbox', label: 'Case à cocher' },
                  { value: 'tag', label: 'Étiquette' }
                ]} required />
              <Input label="Ordre" type="number" value={formData.order || 0} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} />
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isRequired || false} onChange={(e) => setFormData({...formData, isRequired: e.target.checked})} className="w-4 h-4" /><span className="text-sm">Obligatoire</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isActive !== false} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4" /><span className="text-sm">Actif</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.allowCustomValue || false} onChange={(e) => setFormData({...formData, allowCustomValue: e.target.checked})} className="w-4 h-4" /><span className="text-sm">Valeur personnalisée</span></label>
            </div>
            <div className="mt-3 p-3 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2 text-sm">Afficher uniquement si...</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Champ parent" value={formData.parentField || ''} onChange={(e) => setFormData({...formData, parentField: e.target.value})} placeholder="Ex: compressor_type" />
                <Input label="Valeur déclencheur" value={formData.parentValue || ''} onChange={(e) => setFormData({...formData, parentValue: e.target.value})} placeholder="Ex: Atlas Copco" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button onClick={handleAdd} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
            </div>
          </Card>
        );

      case 'machine_field_options':
        return (
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajouter une option de champ</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}><X size={20} /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select label="Champ parent" value={formData.fieldId || ''} onChange={(e) => setFormData({...formData, fieldId: e.target.value})}
                options={[
                  { value: '', label: 'Sélectionner un champ' },
                  ...machineFields.map(field => ({ value: field._id, label: `${field.machineType} - ${field.label}` }))
                ]} required />
              <Input label="Valeur de l'option" value={formData.value || ''} onChange={(e) => setFormData({...formData, value: e.target.value})} required placeholder="Ex: Atlas Copco" />
              <Input label="Ordre" type="number" value={formData.order || 0} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button onClick={handleAdd} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  // ─── Formulaires d'édition ──────────────────────────────────────────────────
  const getEditForm = () => {
    if (activeTable !== 'machine_fields' && activeTable !== 'machine_field_options' && activeTable !== 'maintenance_kits' && activeTable !== 'taches_entretien') return null;

    if (activeTable === 'taches_entretien') return (
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Modifier la tâche</h2>
          <Button variant="ghost" size="sm" onClick={() => { setShowEditForm(false); setEditingItem(null); setFormData({}); }}><X size={20} /></Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Kit parent"
            value={formData.kitId || ''}
            onChange={(e) => setFormData({...formData, kitId: e.target.value})}
            options={[
              { value: '', label: 'Sélectionner un kit' },
              ...maintenanceKits.map(kit => ({
                value: kit._id,
                label: `${kit.nom} — S${kit.serviceNumber} (${kit.machineType})`
              }))
            ]}
          />
          <Input label="Section" value={formData.section || ''} onChange={(e) => setFormData({...formData, section: e.target.value})} placeholder="Ex: VIDANGE, FILTRES..." />
          <Input label="Description" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
          <Input label="Module" value={formData.module || ''} onChange={(e) => setFormData({...formData, module: e.target.value})} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Référence pièce</label>
            <input
              type="text"
              value={formData.refPiece || ''}
              onChange={(e) => setFormData({...formData, refPiece: e.target.value})}
              placeholder="Tapez pour rechercher..."
              list="spare-parts-list-edit"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <datalist id="spare-parts-list-edit">
              {spareParts.map((part: any) => (
                <option key={part._id} value={part.reference} label={`${part.reference} — ${part.designation}`} />
              ))}
            </datalist>
            {formData.refPiece && (() => {
              const found = spareParts.find((p: any) => p.reference === formData.refPiece);
              return found ? <p className="text-xs text-green-600 mt-1">✓ {found.designation}</p> : null;
            })()}
          </div>
          <Input label="Quantité" type="number" value={formData.quantite || ''} onChange={(e) => setFormData({...formData, quantite: parseInt(e.target.value)})} />
          <Input label="Ordre d'affichage" type="number" value={formData.ordre || 0} onChange={(e) => setFormData({...formData, ordre: parseInt(e.target.value)})} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => { setShowEditForm(false); setEditingItem(null); setFormData({}); }}>Annuler</Button>
          <Button onClick={handleUpdate} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
        </div>
      </Card>
    );

    if (activeTable === 'maintenance_kits') return (
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Modifier le kit d'entretien</h2>
          <Button variant="ghost" size="sm" onClick={() => { setShowEditForm(false); setEditingItem(null); setFormData({}); }}><X size={20} /></Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Nom du kit" value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} required />
          <Input label="Type de machine" value={formData.machineType || ''} onChange={(e) => setFormData({...formData, machineType: e.target.value})} required placeholder="Ex: VMS, V300" />
          <Input label="N° Kit" value={formData.kitNumber || ''} onChange={(e) => setFormData({...formData, kitNumber: e.target.value})} />
          <Input label="Kit ID" value={formData.kitId || ''} onChange={(e) => setFormData({...formData, kitId: e.target.value})} />
          <Input label="N° de service (1 à 12)" type="number" value={formData.serviceNumber || 1} onChange={(e) => setFormData({...formData, serviceNumber: parseInt(e.target.value)})} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => { setShowEditForm(false); setEditingItem(null); setFormData({}); }}>Annuler</Button>
          <Button onClick={handleUpdate} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
        </div>
      </Card>
    );

    if (activeTable === 'machine_fields') return (
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Modifier le champ machine</h2>
          <Button variant="ghost" size="sm" onClick={() => { setShowEditForm(false); setEditingItem(null); setFormData({}); }}><X size={20} /></Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Type de machine" value={formData.machineType || ''} onChange={(e) => setFormData({...formData, machineType: e.target.value})} required placeholder="Ex: VMS2014, V300" />
          <Input label="Libellé du champ" value={formData.label || ''} onChange={(e) => setFormData({...formData, label: e.target.value})} required />
          <Select label="Type de champ" value={formData.fieldType || 'text'} onChange={(e) => setFormData({...formData, fieldType: e.target.value})}
            options={[
              { value: 'select', label: 'Menu déroulant' },
              { value: 'text', label: 'Texte libre' },
              { value: 'number', label: 'Nombre' },
              { value: 'date', label: 'Date' },
              { value: 'checkbox', label: 'Case à cocher' },
              { value: 'tag', label: 'Étiquette' }
            ]} required />
          <Input label="Ordre" type="number" value={formData.order || 0} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} />
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isRequired || false} onChange={(e) => setFormData({...formData, isRequired: e.target.checked})} className="w-4 h-4" /><span className="text-sm">Obligatoire</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isActive !== false} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4" /><span className="text-sm">Actif</span></label>
        </div>
        <div className="mt-3 p-3 border border-gray-200 rounded-lg">
          <label className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={formData.hasConditionalRules || false} onChange={(e) => setFormData({...formData, hasConditionalRules: e.target.checked})} className="w-4 h-4" />
            <span className="font-semibold text-sm">Ce champ dépend d'un autre champ</span>
          </label>
          {formData.hasConditionalRules && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Champ parent" value={formData.parentField || ''} onChange={(e) => setFormData({...formData, parentField: e.target.value})} placeholder="Ex: compressor_type" />
              <Input label="Valeur déclencheur" value={formData.parentValue || ''} onChange={(e) => setFormData({...formData, parentValue: e.target.value})} placeholder="Ex: Atlas Copco" />
            </div>
          )}
        </div>
        <div className="mt-3 p-3 border border-gray-200 rounded-lg">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={formData.allowCustomValue || false} onChange={(e) => setFormData({...formData, allowCustomValue: e.target.checked})} className="w-4 h-4" />
            <span className="text-sm">Autoriser valeur personnalisée "Autre"</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => { setShowEditForm(false); setEditingItem(null); setFormData({}); }}>Annuler</Button>
          <Button onClick={handleUpdate} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
        </div>
      </Card>
    );

    if (activeTable === 'machine_field_options') return (
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Modifier l'option de champ</h2>
          <Button variant="ghost" size="sm" onClick={() => { setShowEditForm(false); setEditingItem(null); setFormData({}); }}><X size={20} /></Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select label="Champ parent" value={formData.fieldId || formData.fieldLabel || ''} onChange={(e) => setFormData({...formData, fieldLabel: e.target.options[e.target.selectedIndex].text, fieldId: e.target.value})}
            options={[
              { value: '', label: 'Sélectionner un champ' },
              ...machineFields.map(field => ({ value: field._id, label: `${field.machineType} - ${field.label}` }))
            ]} required />
          <Input label="Valeur de l'option" value={formData.value || ''} onChange={(e) => setFormData({...formData, value: e.target.value})} required placeholder="Ex: Atlas Copco" />
          <Input label="Ordre" type="number" value={formData.order || 0} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => { setShowEditForm(false); setEditingItem(null); setFormData({}); }}>Annuler</Button>
          <Button onClick={handleUpdate} disabled={loading}><Save size={16} className="mr-1" />Enregistrer</Button>
        </div>
      </Card>
    );

    return null;
  };

  // ─── Mise à jour ────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const data = { ...formData, updatedAt: now };

      if (activeTable === 'taches_entretien') {
        await api.entities.taches_entretien.update(editingItem._id, data);
        await new Promise(r => setTimeout(r, 600));
        await reloadTaches();
      } else if (activeTable === 'maintenance_kits') {
        await updateMaintenanceKit(editingItem._id, data);
        await new Promise(r => setTimeout(r, 400));
        await fetchMaintenanceKits();
      } else if (activeTable === 'machine_fields') {
        const fieldData = {
          ...data,
          conditionalRules: formData.hasConditionalRules && formData.parentField ? {
            parentField: formData.parentField,
            parentValue: formData.parentValue
          } : null
        };
        delete fieldData.hasConditionalRules;
        await api.entities.machine_fields.update(editingItem._id, fieldData);
        await fetchMachineFields();
      } else if (activeTable === 'machine_field_options') {
        await api.entities.machine_field_options.update(editingItem._id, data);
        await fetchMachineFieldOptions();
      }

      alert('✅ Élément modifié avec succès !');
      setShowEditForm(false);
      setEditingItem(null);
      setFormData({});
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  // ─── Ajout ──────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const data = { ...formData, actif: true, creator: 'admin', createdAt: now, updatedAt: now };

      switch (activeTable) {
        case 'clients':
          await api.entities.clients.create(data);
          await fetchClients();
          break;
        case 'users':
          await api.entities.utilisateurs.create(data);
          await fetchUsers();
          break;
        case 'spare_parts':
          await api.entities.spare_parts.create(data);
          await fetchSpareParts();
          break;
        case 'maintenance_kits': {
          const newKit = await api.entities.maintenance_kits.create(data);
          await api.entities.taches_entretien.create({
            kitId: newKit._id,
            section: '⚠️ À REMPLIR',
            description: 'Tâche exemple — à modifier ou supprimer',
            module: '',
            refPiece: '',
            quantite: 0,
            ordre: 1,
            etat: 'todo',
            createdAt: now
          });
          await new Promise(r => setTimeout(r, 500));
          await fetchMaintenanceKits();
          await reloadTaches();
          break;
        }
        case 'taches_entretien':
          await api.entities.taches_entretien.create(data);
          await new Promise(r => setTimeout(r, 500));
          await reloadTaches();
          break;
        case 'error_codes':
          await api.entities.error_codes.create(data);
          await fetchErrorCodes();
          break;
        case 'machine_fields': {
          const fieldData = {
            ...data,
            conditionalRules: formData.parentField ? {
              parentField: formData.parentField,
              parentValue: formData.parentValue
            } : null
          };
          await api.entities.machine_fields.create(fieldData);
          await fetchMachineFields();
          break;
        }
        case 'machine_field_options':
          await api.entities.machine_field_options.create(data);
          await fetchMachineFieldOptions();
          break;
      }

      alert('✅ Élément ajouté avec succès !');
      setShowAddForm(false);
      setFormData({});
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  // ─── Config des tables ──────────────────────────────────────────────────────
  const tableConfigs = {
    clients: {
      name: 'Clients',
      data: clients || [],
      columns: [
        { key: 'numeroClient', label: 'N° CLIENT' },
        { key: 'nom', label: 'CONTACT' },
        { key: 'nomFerme', label: 'FERME' },
        { key: 'email', label: 'EMAIL' },
        { key: 'telephone', label: 'TÉL.' },
        { key: 'ville', label: 'VILLE' }
      ],
      csvColumns: [
        { key: 'numeroClient', label: 'n° client', required: true },
        { key: 'nom', label: 'contact', required: true },
        { key: 'nomFerme', label: 'nom ferme', required: false },
        { key: 'adresse', label: 'adressePostale', required: false },
        { key: 'codePostal', label: 'code postal', required: false },
        { key: 'ville', label: 'ville', required: false },
        { key: 'telephone', label: 'téléphone', required: false },
        { key: 'email', label: 'email', required: false }
      ],
      onImport: async (data: any[], options: any) => {
        const result = { success: 0, errors: [] as string[], duplicates: 0 };
        for (const row of data) {
          try {
            const existing = await api.entities.clients.list({ filter: { numeroClient: row.numeroClient }, limit: 1 });
            const clientExists = existing.list && existing.list.length > 0;
            if (clientExists) {
              result.duplicates++;
              if (options?.duplicateStrategy === 'update') {
                await api.entities.clients.update(existing.list[0]._id, { ...row, updatedAt: new Date().toISOString() });
                result.success++;
              } else if (options?.duplicateStrategy === 'reject') {
                throw new Error(`Client ${row.numeroClient} existe déjà - Import annulé`);
              }
            } else {
              await api.entities.clients.create({ ...row, actif: true, creator: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
              result.success++;
            }
          } catch (error) {
            result.errors.push(`Client ${row.numeroClient || 'inconnu'}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
          }
        }
        await fetchClients();
        return result;
      },
      onDelete: async (id: string) => { await deleteClient(id); }
    },

    users: {
      name: 'Utilisateurs',
      data: users || [],
      columns: [
        { key: 'nom', label: 'Nom' },
        { key: 'prenom', label: 'Prénom' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Rôle' },
        { key: 'numeroTechnicien', label: 'N° Tech' }
      ],
      csvColumns: ['nom', 'prenom', 'email', 'role', 'numeroTechnicien'],
onImport: async (data: any[]) => {
  const BATCH_SIZE = 5;
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          await Promise.allSettled(
            data.slice(i, i + BATCH_SIZE).map(row =>
              api.entities.utilisateurs.create({ ...row, actif: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
            )
          );
          if (i + BATCH_SIZE < data.length) await sleep(500);
        }
        await fetchUsers();
      },
      onDelete: undefined
    },

    maintenance_kits: {
      name: 'Kits d\'entretien',
      data: maintenanceKits || [],
      columns: [
        { key: 'kitId', label: 'Kit ID' },
        { key: 'machineType', label: 'Type machine' },
        { key: 'kitNumber', label: 'N° Kit' },
        { key: 'serviceNumber', label: 'Service' },
        { key: 'nom', label: 'Nom' }
      ],
      csvColumns: [],
      useCustomImporter: true,
      onImport: async () => {},
      onDelete: async (id: string) => {
        if (!confirm('Supprimer ce kit d\'entretien ?')) return;
        await deleteMaintenanceKit(id);
        await fetchMaintenanceKits();
      }
    },

    spare_parts: {
      name: 'Pièces détachées',
      data: spareParts || [],
      columns: [
        { key: 'reference', label: 'Référence' },
        { key: 'designation', label: 'Désignation' },
        { key: 'stock', label: 'Stock' },
        { key: 'seuilAlerte', label: 'Seuil' },
        { key: 'prixUnitaire', label: 'Prix' }
      ],
      csvColumns: [
        { key: 'del', label: 'DEL', required: false },
        { key: 'reference', label: 'REFERENCE', required: true },
        { key: 'referenceUM', label: 'U.M.', required: false },
        { key: 'designation', label: 'DESIGNATION', required: true },
        { key: 'deBaseHT', label: 'TARIF DE BASE HT', required: false },
        { key: 'codeVenti', label: 'CODE VENTE', required: false },
        { key: 'grRem', label: 'GR REM', required: false },
        { key: 'grosp', label: 'GROSP', required: false },
        { key: 'cTVA', label: 'C TVA', required: false },
        { key: 'marque', label: 'MARQUE', required: false },
        { key: 'codeBarre', label: 'CODE BARRE', required: false },
        { key: 'date', label: 'DATE TARIF', required: false },
        { key: 'famc', label: 'famc', required: false },
        { key: 'fams', label: 'fams', required: false },
        { key: 'remi', label: 'remi', required: false },
      ],
      onImport: async (data: any[]) => {
        const BATCH_SIZE = 5;
        const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
        let successCount = 0;
        let errors: string[] = [];
        
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const results = await Promise.allSettled(
            data.slice(i, i + BATCH_SIZE).map(row => {
              const cleaned: any = {};
              Object.entries(row).forEach(([k, v]) => {
                if (k && k !== 'undefined') cleaned[k] = v;
              });
              return api.entities.spare_parts.create({ 
                ...cleaned, 
                stock: 0, seuilAlerte: 0, prixUnitaire: 0, 
                actif: true, 
                createdAt: new Date().toISOString(), 
                updatedAt: new Date().toISOString() 
              });
            })
          );
          
          results.forEach(r => {
            if (r.status === 'fulfilled') successCount++;
            else errors.push(r.reason?.message || "Erreur d'import");
          });
          
          if (i + BATCH_SIZE < data.length) await sleep(800);
        }
        await fetchSpareParts();
        return { success: successCount, errors, duplicates: 0 };
      },
      onDelete: async (id: string) => { await deleteSparePart(id); }
    },

    error_codes: {
      name: 'Codes erreur',
      data: errorCodes || [],
      columns: [
        { key: 'alarme', label: 'Alarme' },
        { key: 'typeAlarme', label: 'Type' },
        { key: 'chapitre', label: 'Chapitre' },
        { key: 'titre', label: 'Titre' },
        { key: 'cause', label: 'Cause' },
        { key: 'action', label: 'Action' }
      ],
      csvColumns: [
        { key: 'alarme', label: 'Alarme' },
        { key: 'typeAlarme', label: 'Type' },
        { key: 'chapitre', label: 'Chapitre' },
        { key: 'titre', label: 'Titre' },
        { key: 'cause', label: 'Cause' },
        { key: 'action', label: 'Action' }
      ],
      onImport: async (data: any[]) => {
        const BATCH_SIZE = 5;
        const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
        let successCount = 0; let errors: string[] = [];
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const results = await Promise.allSettled(
            data.slice(i, i + BATCH_SIZE).map(row =>
              api.entities.error_codes.create({ ...row, createdAt: new Date().toISOString() })
            )
          );
          results.forEach(r => { if (r.status === 'fulfilled') successCount++; else errors.push(r.reason?.message || "Erreur d'import"); });
          if (i + BATCH_SIZE < data.length) await sleep(500);
        }
        await fetchErrorCodes();
        return { success: successCount, errors, duplicates: 0 };
      },
      onDelete: async (id: string) => {
        await api.entities.error_codes.delete(id);
        await fetchErrorCodes();
      }
    },

    taches_entretien: {
      name: 'Tâches d\'entretien',
      data: tachesEntretien || [],
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'description', label: 'Description' },
        { key: 'module', label: 'Module' },
        { key: 'refPiece', label: 'Réf. pièce' },
        { key: 'quantite', label: 'Qté' },
        { key: 'ordre', label: 'Ordre' }
      ],
      csvColumns: [
        { key: 'idTache', label: 'ID Tache' },
        { key: 'kitId', label: 'Kit ID' },
        { key: 'section', label: 'Section' },
        { key: 'description', label: 'Description' },
        { key: 'module', label: 'Module' },
        { key: 'etat', label: 'Etat' },
        { key: 'refPiece', label: 'Réf. pièce' },
        { key: 'quantite', label: 'Qté' },
        { key: 'ordre', label: 'Ordre' }
      ],
      onImport: async (data: any[]) => {
        const BATCH_SIZE = 5;
        const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
        let successCount = 0; let errors: string[] = [];
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const results = await Promise.allSettled(
            data.slice(i, i + BATCH_SIZE).map(row =>
              api.entities.taches_entretien.create({ ...row, createdAt: new Date().toISOString() })
            )
          );
          results.forEach(r => { if (r.status === 'fulfilled') successCount++; else errors.push(r.reason?.message || "Erreur d'import"); });
          if (i + BATCH_SIZE < data.length) await sleep(500);
        }
        await reloadTaches();
        return { success: successCount, errors, duplicates: 0 };
      },
      onDelete: async (id: string) => {
        await api.entities.taches_entretien.delete(id);
        await new Promise(r => setTimeout(r, 400));
        await reloadTaches();
      }
    },

    machine_fields: {
      name: 'Champs machines',
      data: machineFields || [],
      columns: [
        { key: 'machineType', label: 'Type machine' },
        { key: 'label', label: 'Libellé' },
        { key: 'fieldType', label: 'Type' },
        { key: 'isRequired', label: 'Oblig.', render: (value: any) => value ? '✓' : '' },
        { key: 'isActive', label: 'Actif', render: (value: any) => value !== false ? '✓' : '' },
        { key: 'order', label: 'Ordre' },
        { key: 'conditionalRules', label: 'Conditionnel', render: (value: any) => value ? `${value.parentField} = ${value.parentValue}` : '' },
        { key: 'allowCustomValue', label: 'Perso', render: (value: any) => value ? '✓' : '' }
      ],
      csvColumns: [
        { key: 'machineType', label: 'Type machine' },
        { key: 'label', label: 'Libellé' },
        { key: 'fieldType', label: 'Type' },
        { key: 'isRequired', label: 'Obligatoire' },
        { key: 'isActive', label: 'Actif' },
        { key: 'order', label: 'Ordre' },
        { key: 'allowCustomValue', label: 'Perso' },
        { key: 'conditionalRules_parentField', label: 'Règle Parent Field' },
        { key: 'conditionalRules_parentValue', label: 'Règle Parent Value' },
        { key: 'creator', label: 'Créateur' },
        { key: 'createdAt', label: 'Date création' },
        { key: 'updatedAt', label: 'Date modif' },
        { key: 'creatorEmail', label: 'Email créateur' }
      ],
      onImport: async (data: any[]) => {
        let successCount = 0; let errors: string[] = [];
        for (const row of data) {
          try {
            const fieldData: any = {
              machineType: row.machineType || 'Tous',
              label: row.label,
              fieldType: row.fieldType || 'text',
              isRequired: row.isRequired === 'true' || row.isRequired === true,
              isActive: row.isActive === 'true' || row.isActive === true || row.isActive !== 'false',
              order: parseInt(row.order) || 0,
              allowCustomValue: row.allowCustomValue === 'true' || row.allowCustomValue === true,
              creator: row.creator || 'admin',
              createdAt: row.createdAt || new Date().toISOString(),
              updatedAt: row.updatedAt || new Date().toISOString(),
              creatorEmail: row.creatorEmail || 'admin@soplanelevage.fr'
            };
            if (row.conditionalRules_parentField && row.conditionalRules_parentValue) {
              fieldData.conditionalRules = {
                parentField: row.conditionalRules_parentField.trim(),
                parentValue: row.conditionalRules_parentValue.trim()
              };
            }
            await api.entities.machine_fields.create(fieldData);
            successCount++;
          } catch (e: any) {
            errors.push(e.message || "Erreur d'import");
          }
        }
        await fetchMachineFields();
        return { success: successCount, errors, duplicates: 0 };
      },
      onDelete: async (id: string) => { await deleteMachineField(id); }
    },

    machine_field_options: {
      name: 'Options de champs',
      data: machineFieldOptions || [],
      columns: [
        {
          key: 'fieldId',
          label: 'Champ parent',
          render: (value: any) => {
            const field = machineFields.find(f => f._id === value);
            return field ? `${field.machineType} - ${field.label}` : value;
          }
        },
        { key: 'value', label: 'Valeur' },
        { key: 'order', label: 'Ordre' }
      ],
      csvColumns: [
        { key: 'fieldId', label: 'Champ parent' },
        { key: 'value', label: 'Valeur' },
        { key: 'order', label: 'Ordre' }
      ],
      onImport: async (data: any[]) => {
        const BATCH_SIZE = 5;
        const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
        let successCount = 0; let errors: string[] = [];
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const results = await Promise.allSettled(
            data.slice(i, i + BATCH_SIZE).map(row =>
              api.entities.machine_field_options.create({ ...row, createdAt: new Date().toISOString() })
            )
          );
          results.forEach(r => { if (r.status === 'fulfilled') successCount++; else errors.push(r.reason?.message || "Erreur d'import"); });
          if (i + BATCH_SIZE < data.length) await sleep(500);
        }
        await fetchMachineFieldOptions();
        return { success: successCount, errors, duplicates: 0 };
      },
      onDelete: async (id: string) => { await deleteMachineFieldOption(id); }
    },

    languages: {
      name: 'Langues',
      data: [], columns: [], csvColumns: [],
      onImport: async () => {}, onDelete: undefined
    },

    translations: {
      name: 'Traductions',
      data: [], columns: [], csvColumns: [],
      onImport: async () => {}, onDelete: undefined
    },

    // ── Suivi des connexions ─────────────────────────────────────────────────
    connections: {
      name: '👁 Connexions',
      data: connections,
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'userName', label: 'Utilisateur' },
        { key: 'userEmail', label: 'Email' },
        { key: 'userRole', label: 'Rôle' },
        { key: 'timestamp', label: 'Heure', render: (v: string) => v ? new Date(v).toLocaleTimeString('fr-FR') : '' }
      ],
      csvColumns: [
        { key: 'date', label: 'Date' },
        { key: 'userName', label: 'Utilisateur' },
        { key: 'userEmail', label: 'Email' },
        { key: 'userRole', label: 'Rôle' },
        { key: 'timestamp', label: 'Timestamp' }
      ],
      onImport: async () => {},
      onDelete: undefined
    }
    // ─────────────────────────────────────────────────────────────────────────
  };

  const clientsAvecMachines = clients.filter(client =>
    machines.some(machine => machine.clientId === client._id)
  ).length;

  const config = tableConfigs[activeTable];

  return (
    <div className="w-full min-w-0 space-y-4 pb-20 lg:pb-6 px-2 sm:px-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 min-w-0">
        <Database className="text-blue-600 shrink-0" size={28} />
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">Administration des bases</h1>
          <p className="text-xs text-gray-500">Gestion et import des données</p>
        </div>
      </div>

      {/* ── Statistiques ── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        <Card className="p-2 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-xl font-bold text-blue-600">{clientsAvecMachines}/{clients.length}</div>
          <div className="text-xs text-gray-600 leading-tight">Clients machines</div>
        </Card>
<Card className="p-2 bg-gradient-to-br from-green-50 to-green-100">
  <div className="text-xl font-bold text-green-600">
    {users?.filter(u => u.hasAccount).length || 0}/{users?.length || 0}
  </div>
  <div className="text-xs text-gray-600 leading-tight">Comptes activés</div>
</Card>        <Card className="p-2 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="text-xl font-bold text-purple-600">{sparePartsTotal || 0}</div>
          <div className="text-xs text-gray-600">Pièces</div>
        </Card>
        <Card className="p-2 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="text-xl font-bold text-orange-600">{maintenanceKits?.length || 0}</div>
          <div className="text-xs text-gray-600">Kits</div>
        </Card>
        <Card className="p-2 bg-gradient-to-br from-red-50 to-red-100">
          <div className="text-xl font-bold text-red-600">{errorCodes?.length || 0}</div>
          <div className="text-xs text-gray-600">Codes erreur</div>
        </Card>
        <Card className="p-2 bg-gradient-to-br from-indigo-50 to-indigo-100">
          <div className="text-xl font-bold text-indigo-600">{tachesEntretien?.length || 0}</div>
          <div className="text-xs text-gray-600">Tâches</div>
        </Card>
      </div>

      {/* ── Bouton initialisation ── */}
      <Card className="p-3 bg-blue-50">
        <Button size="sm" onClick={async () => {
          if (!confirm('Créer les 5 champs ?')) return;
          setLoading(true);
          try {
            await api.entities.machine_fields.create({ machineType: 'Tous', label: 'Type de machine principal', fieldType: 'select', isRequired: true, isActive: true, order: 1, creator: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            await api.entities.machine_fields.create({ machineType: 'Tous', label: 'Type de pompe', fieldType: 'select', isRequired: true, isActive: true, order: 10, conditionalRules: { parentField: 'Type de machine principal', parentValue: 'Pompe à vide' }, allowCustomValue: true, creator: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            await api.entities.machine_fields.create({ machineType: 'Tous', label: 'Variateur', fieldType: 'select', isRequired: false, isActive: true, order: 11, conditionalRules: { parentField: 'Type de machine principal', parentValue: 'Pompe à vide' }, allowCustomValue: true, creator: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            await api.entities.machine_fields.create({ machineType: 'Tous', label: 'Armoire', fieldType: 'select', isRequired: false, isActive: true, order: 12, conditionalRules: { parentField: 'Type de machine principal', parentValue: 'Pompe à vide' }, allowCustomValue: true, creator: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            await api.entities.machine_fields.create({ machineType: 'Tous', label: 'Options V300', fieldType: 'select', isRequired: false, isActive: true, order: 20, conditionalRules: { parentField: 'Type de machine principal', parentValue: 'V300' }, allowCustomValue: true, creator: 'admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            alert('✅ Champs créés !');
            await fetchMachineFields();
          } catch (e: any) { alert('Erreur: ' + e.message); }
          setLoading(false);
        }}>🚀 Créer les champs</Button>
      </Card>

      {/* ── Onglets + Actions ── */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(tableConfigs) as TableType[])
            // Masquer l'onglet connexions aux utilisateurs non autorisés
            .filter(table => table !== 'connections' || canViewConnections)
            .map((table) => (
            <button
              key={table}
              onClick={() => {
                if (table === 'languages') {
                  onNavigate?.('language-config');
                } else if (table === 'translations') {
                  onNavigate?.('translation-editor');
                } else {
                  setActiveTable(table);
                  setShowImporter(false);
                  setShowAddForm(false);
                  setShowEditForm(false);
                  // Recharger les connexions à l'activation de l'onglet
                  if (table === 'connections') fetchConnections();
                }
              }}
              className={`px-2.5 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTable === table
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tableConfigs[table].name}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (activeTable === 'maintenance_kits') {
                setShowKitImporter(!showKitImporter);
                setShowImporter(false);
              } else {
                setShowImporter(!showImporter);
                setShowKitImporter(false);
              }
              setShowAddForm(false);
            }}
            className="flex items-center gap-1"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowImporter(false);
              setShowKitImporter(false);
              setShowEditForm(false);
              setFormData({});
            }}
            className="flex items-center gap-1"
          >
            <Plus size={15} />
            Ajouter
          </Button>

          {activeTable === 'spare_parts' && (
            <Button
              size="sm"
              variant="secondary"
              disabled={loading}
              onClick={async () => {
                if (!confirm(`⚠️ Supprimer TOUS les ${sparePartsTotal} enregistrements de pièces ? Cette action est irréversible.`)) return;
                setLoading(true);
                const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
                let deleted = 0;
                try {
                  while (true) {
                    const { list } = await api.entities.spare_parts.list({ filter: {}, limit: 100 });
                    if (!list || list.length === 0) break;
                    await Promise.allSettled(list.map((item: any) => api.entities.spare_parts.delete(item._id)));
                    deleted += list.length;
                    console.log(`🗑️ Supprimés : ${deleted}`);
                    await sleep(500);
                  }
                  alert(`✅ ${deleted} enregistrements supprimés.`);
                  await fetchSpareParts({ filter: {} });
                } catch (e: any) {
                  alert('❌ Erreur : ' + e.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="flex items-center gap-1 text-red-600"
            >
              🗑️ Tout supprimer
            </Button>
          )}
        </div>
      </Card>

      {/* ── Formulaire d'ajout ── */}
      {showAddForm && getAddForm()}

      {/* ── Formulaire d'édition ── */}
      {showEditForm && getEditForm()}

      {/* ── CSV Importer ── */}
      {showImporter && !config.useCustomImporter && (
        <CSVImporter
          tableName={config.name}
          columns={config.csvColumns}
          onImport={config.onImport}
        />
      )}

      {/* ── Maintenance Kit Importer ── */}
      {showKitImporter && activeTable === 'maintenance_kits' && (
        <MaintenanceKitImporter
          onImport={async (kitsToImport) => {
            setLoading(true);
            try {
              let totalTasks = 0;
              for (const { kitMetadata, tasksData } of kitsToImport) {
                const newKit = await api.entities.maintenance_kits.create({
                  kitId: kitMetadata.kitId,
                  machineType: kitMetadata.machineType,
                  kitNumber: kitMetadata.kitNumber,
                  serviceNumber: kitMetadata.serviceNumber,
                  nom: kitMetadata.nom || `Kit ${kitMetadata.kitNumber}`,
                  creator: 'admin',
                  actif: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
                for (const task of tasksData) {
                  await api.entities.taches_entretien.create({
                    kitId: newKit._id,
                    section: task.section,
                    description: task.description,
                    module: task.module,
                    etat: task.etat || 'todo',
                    refPiece: task.refPiece,
                    quantite: task.quantite,
                    ordre: task.ordre || 0,
                    createdAt: new Date().toISOString()
                  });
                }
                totalTasks += tasksData.length;
              }
              alert(`✅ ${kitsToImport.length} kit(s) et un total de ${totalTasks} tâches ont été importés avec succès.`);
              setShowKitImporter(false);
              await fetchMaintenanceKits();
              await reloadTaches();
            } catch (error) {
              console.error("❌ Erreur import kit:", error);
              alert("❌ Erreur lors de l'import. Vérifiez la console.");
            } finally {
              setLoading(false);
            }
          }}
          onClose={() => { setShowKitImporter(false); fetchMaintenanceKits(); }}
        />
      )}

      {/* ── Visuel Connexions — suivi par utilisateur ──────────────────────── */}
      {activeTable === 'connections' && canViewConnections && (() => {

        const [year, month] = connectionMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        // ── Calcul des jours ouvrés du mois (lun–ven) ─────────────────────────
        let workedDaysInMonth = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const dow = new Date(year, month - 1, d).getDay(); // 0=dim, 6=sam
          if (dow !== 0 && dow !== 6) workedDaysInMonth++;
        }

        // ── Index connexions : userId/email → Set de dates distinctes ─────────
        const connByUser: Record<string, Set<string>> = {};
        connections.forEach(c => {
          const key = c.userId || c.userEmail;
          if (!connByUser[key]) connByUser[key] = new Set();
          connByUser[key].add(c.date);
        });

        // ── Index connexions : date → nb users distincts (pour le calendrier) ─
        const dayUserMap: Record<string, Set<string>> = {};
        connections.forEach(c => {
          if (!dayUserMap[c.date]) dayUserMap[c.date] = new Set();
          dayUserMap[c.date].add(c.userId || c.userEmail);
        });

        // ── Navigation mois ────────────────────────────────────────────────────
        // Limite : pas avant 12 mois en arrière, pas après le mois courant
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const minMonthDate = new Date(); minMonthDate.setFullYear(minMonthDate.getFullYear() - 1);
        const minMonthStr = minMonthDate.toISOString().slice(0, 7);

        const canGoPrev = connectionMonth > minMonthStr;
        const canGoNext = connectionMonth < currentMonthStr;

        const prevMonth = () => {
          if (!canGoPrev) return;
          const d = new Date(`${connectionMonth}-01`);
          d.setMonth(d.getMonth() - 1);
          const m = d.toISOString().slice(0, 7);
          setConnectionMonth(m);
          fetchConnections(m);
        };
        const nextMonth = () => {
          if (!canGoNext) return;
          const d = new Date(`${connectionMonth}-01`);
          d.setMonth(d.getMonth() + 1);
          const m = d.toISOString().slice(0, 7);
          setConnectionMonth(m);
          fetchConnections(m);
        };

        const monthLabel = new Date(`${connectionMonth}-15`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        const today = new Date().toISOString().slice(0, 10);

        // ── Utilisateurs actifs dans la liste (excl. clients) ─────────────────
        const activeUsers = (users || []).filter(u => u.actif !== false && u.role !== 'CLIENT');

        return (
          <Card className="p-4 space-y-5">

            {/* ── En-tête navigation mois ── */}
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} disabled={!canGoPrev} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${canGoPrev ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>←</button>
              <div className="text-center">
                <div className="text-base font-bold capitalize">{monthLabel}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  <span className="font-semibold text-blue-600">{workedDaysInMonth}</span> jours ouvrés
                  {' · '}
                  <span className="font-semibold text-green-600">{activeUsers.length}</span> utilisateurs
                </div>
              </div>
              <button onClick={nextMonth} disabled={!canGoNext} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${canGoNext ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>→</button>
            </div>

            {/* ── Calendrier jours du mois ── */}
            <div>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                {['L','M','M','J','V','S','D'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-gray-400 font-medium pb-0.5">{d}</div>
                ))}
                {/* Décalage 1er jour */}
                {Array.from({ length: (() => { const dow = new Date(year, month - 1, 1).getDay(); return dow === 0 ? 6 : dow - 1; })() }, (_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = String(i + 1).padStart(2, '0');
                  const dateStr = `${connectionMonth}-${day}`;
                  const dow = new Date(year, month - 1, i + 1).getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const count = dayUserMap[dateStr]?.size || 0;
                  const isToday = dateStr === today;

                  let bgClass = isWeekend ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-400';
                  if (!isWeekend && count > 0) {
                    if (count >= 10) bgClass = 'bg-blue-700 text-white';
                    else if (count >= 5) bgClass = 'bg-blue-500 text-white';
                    else if (count >= 3) bgClass = 'bg-blue-300 text-blue-900';
                    else bgClass = 'bg-blue-100 text-blue-700';
                  }

                  return (
                    <div
                      key={dateStr}
                      className={`rounded p-0.5 text-center ${bgClass} ${isToday ? 'ring-2 ring-orange-400' : ''}`}
                      title={count > 0 ? `${count} connexion(s) le ${dateStr}` : dateStr}
                    >
                      <div className="text-[10px] font-bold leading-none">{i + 1}</div>
                      {count > 0 && <div className="text-[8px] leading-none opacity-80">{count}</div>}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 mt-2">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-100 inline-block border" /> 0</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-100 inline-block" /> 1–2</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-300 inline-block" /> 3–4</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> 5–9</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-700 inline-block" /> 10+</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded ring-2 ring-orange-400 bg-gray-100 inline-block" /> Aujourd'hui</span>
              </div>
            </div>

            {/* ── Liste des utilisateurs avec barre de progression ── */}
            <div className="space-y-1.5 pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Suivi de présence — {activeUsers.length} utilisateurs</span>
                <span className="text-[10px] text-gray-400">x / {workedDaysInMonth} j ouvrés</span>
              </div>

              {activeUsers
                .map(u => {
                  // Trouver les connexions de cet utilisateur par email (clé la plus fiable)
                  const key = Object.keys(connByUser).find(k => k === u._id || k === u.email) || '';
                  const daysConnected = connByUser[key]?.size || 0;
                  return { u, daysConnected };
                })
                .sort((a, b) => b.daysConnected - a.daysConnected) // Les plus actifs en premier
                .map(({ u, daysConnected }, i) => {
                  const pct = workedDaysInMonth > 0 ? Math.min(100, (daysConnected / workedDaysInMonth) * 100) : 0;
                  // Couleur barre selon taux de présence
                  const barColor = daysConnected === 0
                    ? 'bg-gray-200'
                    : pct >= 80 ? 'bg-green-500'
                    : pct >= 50 ? 'bg-blue-500'
                    : pct >= 20 ? 'bg-orange-400'
                    : 'bg-red-400';

                  const fullName = `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email;
                  const role = u.role || '';

                  return (
                    <div key={u._id || i} className="flex items-center gap-2 py-0.5">
                      {/* Nom + rôle */}
                      <div className="w-40 min-w-0 shrink-0">
                        <div className="text-xs font-medium truncate leading-tight">{fullName}</div>
                        <div className="text-[9px] text-gray-400 truncate leading-tight">{role}</div>
                      </div>
                      {/* Barre de progression */}
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden min-w-0">
                        <div
                          className={`h-2 rounded-full transition-all ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {/* Compteur x/Nj */}
                      <div className={`text-xs font-bold shrink-0 w-14 text-right tabular-nums ${daysConnected === 0 ? 'text-gray-300' : pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-blue-600' : 'text-orange-500'}`}>
                        {daysConnected}/{workedDaysInMonth}j
                      </div>
                    </div>
                  );
                })}

              {activeUsers.length === 0 && (
                <div className="text-xs text-gray-400 italic text-center py-4">Aucun utilisateur actif trouvé</div>
              )}
            </div>

          </Card>
        );
      })()}
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* ── Tableau ── */}
      <Card className="min-w-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <DataTable
            data={config.data}
            columns={config.columns}
            onEdit={async (item) => {
              if (activeTable === 'clients') {
                onNavigate?.('client-form', { clientId: item._id });
              } else if (activeTable === 'taches_entretien') {
                // ✅ Rechargement frais depuis lumi avant d'ouvrir le formulaire
                const fresh = await api.entities.taches_entretien.get(item._id);
                setEditingItem(fresh || item);
                setFormData({ ...(fresh || item) });
                setShowEditForm(true);
                setShowAddForm(false);
                setShowImporter(false);
                setShowKitImporter(false);
              } else if (activeTable === 'maintenance_kits') {
                setEditingItem(item);
                setFormData({ ...item });
                setShowEditForm(true);
                setShowAddForm(false);
                setShowImporter(false);
                setShowKitImporter(false);
              } else if (activeTable === 'machine_fields') {
                setEditingItem(item);
                setFormData({
                  ...item,
                  hasConditionalRules: !!item.conditionalRules,
                  parentField: item.conditionalRules?.parentField || '',
                  parentValue: item.conditionalRules?.parentValue || ''
                });
                setShowEditForm(true);
                setShowAddForm(false);
                setShowImporter(false);
                setShowKitImporter(false);
              } else if (activeTable === 'machine_field_options') {
                setEditingItem(item);
                setFormData({ ...item });
                setShowEditForm(true);
                setShowAddForm(false);
                setShowImporter(false);
                setShowKitImporter(false);
              }
            }}
            onDelete={config.onDelete}
          />
        </div>
      </Card>
    </div>
  );
}