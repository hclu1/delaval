// MaintenanceMonitoringScreen.tsx
// Vue surveillance maintenance centralisée
import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { AlertTriangle, Settings, Mail, Trash2, RefreshCw, Calendar, User, Wrench, Plus, X, Tag } from 'lucide-react';
import { useMaintenanceMonitoring, MonitoringGroup } from '../../hooks/useMaintenanceMonitoring';
import { useAuth } from '../../hooks/useAuth';
import { useVisibilityRefresh } from '../../hooks/useVisibilityRefresh';

interface MaintenanceMonitoringScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}

export function MaintenanceMonitoringScreen({ onNavigate }: MaintenanceMonitoringScreenProps) {
  const {
    alerts,
    config,
    loading,
    monitorAllMachines,
    saveConfig,
    sendEmailNotification,
    dismissAlert,
    getAlertsForUser
  } = useMaintenanceMonitoring();

  const { userData } = useAuth();
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState(config);

  // Onglet actif dans la config : 'thresholds' ou 'groups'
  const [configTab, setConfigTab] = useState<'thresholds' | 'groups'>('thresholds');

  // État d'édition d'un groupe (null = aucun groupe en cours d'édition)
  const [editingGroup, setEditingGroup] = useState<MonitoringGroup | null>(null);
  const [newMachineTypeInput, setNewMachineTypeInput] = useState('');

  // Synchroniser configForm quand config change (après saveConfig)
  React.useEffect(() => { setConfigForm(config); }, [config]);

  // Rafraîchissement automatique au retour sur l'écran
  useVisibilityRefresh(monitorAllMachines);

  // Extraire tous les rôles de l'utilisateur connecté (role, role2, role3, roles[])
  const userRoles = useMemo(() => [
    userData?.role,
    userData?.role2,
    userData?.role3,
    ...(Array.isArray(userData?.roles) ? userData.roles : [])
  ].filter(Boolean) as string[], [userData]);

  // Admin et Responsable Technique ont accès à la configuration
  const isAdminOrManager = userRoles.some(r =>
    ['ADMINISTRATEUR', 'RESPONSABLE_TECHNIQUE'].includes(r)
  );

  // Seuls Admin et Responsable Technique peuvent marquer une alerte comme traitée
  const canDismiss = isAdminOrManager;

  // Alertes filtrées selon le rôle : un technicien VMS ne voit que le groupe VMS, etc.
  const visibleAlerts = useMemo(() => getAlertsForUser(userRoles), [getAlertsForUser, userRoles]);

  // ─── Handlers alertes ───────────────────────────────────────────────────────

  const handleDismissAlert = async (machineId: string, machineName: string) => {
    if (!canDismiss) {
      alert('Vous n\'avez pas les droits pour supprimer cette alerte');
      return;
    }
    if (!confirm(`Marquer l'entretien de "${machineName}" comme effectué ?`)) return;
    try {
      await dismissAlert(machineId);
    } catch {
      alert('Erreur lors de la suppression de l\'alerte');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await saveConfig(configForm);
      setShowConfig(false);
      alert('Configuration enregistrée');
    } catch {
      alert('Erreur lors de la sauvegarde');
    }
  };

  // ─── Handlers groupes ────────────────────────────────────────────────────────

  // Ouvrir l'éditeur pour un groupe existant
  const handleEditGroup = (group: MonitoringGroup) => {
    setEditingGroup({ ...group, machineTypes: [...group.machineTypes] });
    setNewMachineTypeInput('');
  };

  // Créer un nouveau groupe vide
  const handleAddGroup = () => {
    setEditingGroup({
      id: `GROUP_${Date.now()}`,
      name: 'Nouveau groupe',
      machineTypes: [],
      visibleToRoles: ['ADMINISTRATEUR', 'RESPONSABLE_TECHNIQUE']
    });
    setNewMachineTypeInput('');
  };

  // Valider et sauvegarder le groupe en cours d'édition dans configForm
  const handleSaveGroup = () => {
    if (!editingGroup) return;
    if (!editingGroup.name.trim()) { alert('Donnez un nom au groupe'); return; }
    if (editingGroup.machineTypes.length === 0) { alert('Ajoutez au moins un type de machine'); return; }

    const existingIndex = configForm.groups.findIndex(g => g.id === editingGroup.id);
    const updatedGroups = existingIndex >= 0
      ? configForm.groups.map(g => g.id === editingGroup.id ? editingGroup : g)
      : [...configForm.groups, editingGroup];

    setConfigForm({ ...configForm, groups: updatedGroups });
    setEditingGroup(null);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!confirm('Supprimer ce groupe de surveillance ?')) return;
    setConfigForm({ ...configForm, groups: configForm.groups.filter(g => g.id !== groupId) });
  };

  // Ajouter un type de machine au groupe en cours d'édition (ex: "V300")
  const handleAddMachineType = () => {
    const val = newMachineTypeInput.trim().toUpperCase();
    if (!val || !editingGroup) return;
    if (editingGroup.machineTypes.includes(val)) { setNewMachineTypeInput(''); return; }
    setEditingGroup({ ...editingGroup, machineTypes: [...editingGroup.machineTypes, val] });
    setNewMachineTypeInput('');
  };

  const handleRemoveMachineType = (type: string) => {
    if (!editingGroup) return;
    setEditingGroup({ ...editingGroup, machineTypes: editingGroup.machineTypes.filter(t => t !== type) });
  };

  // Cocher/décocher un rôle dans le groupe en cours d'édition
  const toggleRoleInGroup = (roleValue: string) => {
    if (!editingGroup) return;
    const has = editingGroup.visibleToRoles.includes(roleValue);
    setEditingGroup({
      ...editingGroup,
      visibleToRoles: has
        ? editingGroup.visibleToRoles.filter(r => r !== roleValue)
        : [...editingGroup.visibleToRoles, roleValue]
    });
  };

  // Rôles disponibles à assigner à un groupe
  const availableRoles = [
    { value: 'ADMINISTRATEUR',       label: 'Administrateur' },
    { value: 'RESPONSABLE_TECHNIQUE', label: 'Responsable Technique' },
    { value: 'CHEF_TECHNICIEN_VMS',  label: 'Chef Technicien VMS' },
    { value: 'TECHNICIEN_VMS',       label: 'Technicien VMS' },
    { value: 'CHEF_TECHNICIEN_CMS',  label: 'Chef Technicien CMS' },
    { value: 'TECHNICIEN_CMS',       label: 'Technicien CMS' },
    { value: 'CHEF_MONTEUR',         label: 'Chef Monteur' },
    { value: 'MONTEUR',              label: 'Monteur' },
  ];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  // ─── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Surveillance Maintenance</h1>
          <p className="text-gray-600 mt-1">
            {visibleAlerts.length} machine{visibleAlerts.length > 1 ? 's' : ''} nécessitant une attention
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={() => monitorAllMachines()} disabled={loading} className="flex items-center gap-2">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </Button>
          {/* Bouton Configuration : réservé Admin et Responsable Technique */}
          {isAdminOrManager && (
            <Button variant="secondary" onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-2">
              <Settings size={18} />
              Configuration
            </Button>
          )}
        </div>
      </div>

      {/* ── Compteurs rapides ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Urgent</p>
              <p className="text-3xl font-bold text-red-700">{visibleAlerts.filter(a => a.status === '🔴').length}</p>
            </div>
            <div className="text-4xl">🔴</div>
          </div>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Proche</p>
              <p className="text-3xl font-bold text-orange-700">{visibleAlerts.filter(a => a.status === '🟠').length}</p>
            </div>
            <div className="text-4xl">🟠</div>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Prévu</p>
              <p className="text-3xl font-bold text-green-700">{visibleAlerts.filter(a => a.status === '🟢').length}</p>
            </div>
            <div className="text-4xl">🟢</div>
          </div>
        </Card>
      </div>

      {/* ── Panneau de configuration ── */}
      {showConfig && isAdminOrManager && (
        <Card className="bg-blue-50">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Configuration</h2>

          {/* Onglets */}
          <div className="flex gap-2 mb-4 border-b border-blue-200">
            <button
              onClick={() => setConfigTab('thresholds')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${configTab === 'thresholds' ? 'bg-white text-blue-600 border border-blue-200 border-b-white' : 'text-gray-600 hover:text-blue-600'}`}
            >
              Seuils d'alerte
            </button>
            <button
              onClick={() => setConfigTab('groups')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${configTab === 'groups' ? 'bg-white text-blue-600 border border-blue-200 border-b-white' : 'text-gray-600 hover:text-blue-600'}`}
            >
              Groupes de surveillance
            </button>
          </div>

          {/* ── Onglet : Seuils ── */}
          {configTab === 'thresholds' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🟢 Vert (jours)</label>
                  <input type="number" value={configForm.greenThreshold}
                    onChange={(e) => setConfigForm({ ...configForm, greenThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🟠 Orange (jours)</label>
                  <input type="number" value={configForm.orangeThreshold}
                    onChange={(e) => setConfigForm({ ...configForm, orangeThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🔴 Rouge (jours)</label>
                  <input type="number" value={configForm.redThreshold}
                    onChange={(e) => setConfigForm({ ...configForm, redThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={configForm.emailEnabled}
                  onChange={(e) => setConfigForm({ ...configForm, emailEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600" />
                <label className="text-sm font-medium text-gray-700">Activer les notifications email</label>
              </div>
              {configForm.emailEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email du destinataire</label>
                  <input type="email" value={configForm.emailRecipient}
                    onChange={(e) => setConfigForm({ ...configForm, emailRecipient: e.target.value })}
                    placeholder="destinataire@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              )}
            </div>
          )}

          {/* ── Onglet : Groupes de surveillance ── */}
          {configTab === 'groups' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Chaque groupe définit les types de machines surveillés et les rôles qui voient leurs alertes.
              </p>

              {/* Liste des groupes existants */}
              <div className="space-y-3">
                {configForm.groups.map(group => (
                  <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag size={16} className="text-blue-500" />
                          <span className="font-semibold text-gray-900">{group.name}</span>
                        </div>
                        {/* Types de machines sous forme de badges */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {group.machineTypes.map(t => (
                            <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{t}</span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">Visible par : {group.visibleToRoles.join(', ')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditGroup(group)}>Modifier</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteGroup(group.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="secondary" onClick={handleAddGroup} className="flex items-center gap-2">
                <Plus size={16} />
                Ajouter un groupe
              </Button>

              {/* ── Éditeur de groupe ── */}
              {editingGroup && (
                <div className="bg-white border-2 border-blue-300 rounded-lg p-4 space-y-4">
                  <h3 className="font-bold text-gray-900">
                    {configForm.groups.find(g => g.id === editingGroup.id) ? 'Modifier le groupe' : 'Nouveau groupe'}
                  </h3>

                  {/* Nom du groupe */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du groupe</label>
                    <input type="text" value={editingGroup.name}
                      onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                      placeholder="Ex: Groupe VMS"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>

                  {/* Types de machines */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Types de machines surveillés</label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {editingGroup.machineTypes.map(t => (
                        <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                          {t}
                          <button onClick={() => handleRemoveMachineType(t)} className="hover:text-red-600">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={newMachineTypeInput}
                        onChange={(e) => setNewMachineTypeInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMachineType()}
                        placeholder="Ex: V300"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <Button variant="secondary" size="sm" onClick={handleAddMachineType}>
                        <Plus size={14} />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Appuyez sur Entrée ou cliquez + pour ajouter</p>
                  </div>

                  {/* Rôles autorisés */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rôles qui voient ce groupe</label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableRoles.map(role => (
                        <label key={role.value} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox"
                            checked={editingGroup.visibleToRoles.includes(role.value)}
                            onChange={() => toggleRoleInGroup(role.value)}
                            className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">{role.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setEditingGroup(null)}>Annuler</Button>
                    <Button onClick={handleSaveGroup}>Sauvegarder le groupe</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Boutons de sauvegarde globale de la config */}
          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-blue-200">
            <Button variant="ghost" onClick={() => { setShowConfig(false); setEditingGroup(null); }}>Annuler</Button>
            <Button onClick={handleSaveConfig}>Enregistrer la configuration</Button>
          </div>
        </Card>
      )}

      {/* ── Liste des alertes ── */}
      {loading ? (
        <Card className="text-center py-12">
          <div className="animate-spin mx-auto w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-500">Analyse en cours...</p>
        </Card>
      ) : visibleAlerts.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-xl font-medium text-gray-900 mb-2">Aucune alerte active</p>
          <p className="text-gray-500">Toutes les machines sont à jour</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleAlerts.map((alert) => (
            <Card
              key={alert.machineId}
              className={`
                ${alert.status === '🔴' ? 'border-red-300 bg-red-50' : ''}
                ${alert.status === '🟠' ? 'border-orange-300 bg-orange-50' : ''}
                ${alert.status === '🟢' ? 'border-green-300 bg-green-50' : ''}
              `}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{alert.status}</span>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{alert.machineName}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Type de machine (ex: V300) */}
                        {alert.machineType && (
                          <p className="text-xs text-blue-600 font-medium">{alert.machineType}</p>
                        )}
                        {/* Badge du groupe de surveillance (ex: Groupe VMS) */}
                        {alert.groupName && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <Tag size={10} />
                            {alert.groupName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <User size={14} />
                        {alert.clientName}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Wrench size={16} />
                      <span className="font-medium">Type:</span>
                      <span>{alert.maintenanceType}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar size={16} />
                      <span className="font-medium">Dernier:</span>
                      <span>{formatDate(alert.lastMaintenanceDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar size={16} />
                      <span className="font-medium">Prochain:</span>
                      <span className="font-bold">{formatDate(alert.nextMaintenanceDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <AlertTriangle size={16} />
                      <span className="font-medium">Dans:</span>
                      <span className="font-bold">
                        {alert.daysUntilMaintenance < 0
                          ? `En retard de ${Math.abs(alert.daysUntilMaintenance)} jour${Math.abs(alert.daysUntilMaintenance) > 1 ? 's' : ''}`
                          : `${alert.daysUntilMaintenance} jour${alert.daysUntilMaintenance > 1 ? 's' : ''}`
                        }
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-600">
                    <span className="font-medium">Périodicité:</span> {alert.periodicity}
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 flex-wrap">
                  <Button variant="ghost" size="sm"
                    onClick={() => onNavigate('machine-detail', { machineId: alert.machineId })}
                    className="whitespace-nowrap">
                    Détails
                  </Button>
                  {config.emailEnabled && (
                    <Button variant="ghost" size="sm" onClick={() => sendEmailNotification(alert)} className="flex items-center gap-1">
                      <Mail size={14} />
                      Notifier
                    </Button>
                  )}
                  {canDismiss && (
                    <Button variant="ghost" size="sm"
                      onClick={() => handleDismissAlert(alert.machineId, alert.machineName)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700">
                      <Trash2 size={14} />
                      Traité
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}