import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {Plus, Users, Edit, Trash2, Save, X, Shield, Mail, ChevronDown, ChevronUp, CheckCircle} from 'lucide-react';
import { api } from '../../lib/api';
// AJOUT: Import pour récupérer l'utilisateur connecté
import { useAuth } from '../../hooks/useAuth'; 


interface UsersScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}


const PERMISSIONS = [
  // === CLIENTS ===
  { id: 'view_clients', label: '👥 Voir les clients' },
  { id: 'edit_clients', label: '✏️ Gérer les clients (créer/modifier/supprimer)' },
  
  // === MACHINES ===
  { id: 'view_machines', label: '⚙️ Voir les machines' },
  { id: 'edit_machines', label: '🔧 Gérer les machines (créer/modifier/supprimer)' },
  
  // === INTERVENTIONS PAR TYPE ===
  { id: 'view_interventions_maintenance', label: '🔧 Voir les entretiens/maintenances' },
  { id: 'create_interventions_maintenance', label: '➕ Créer des entretiens/maintenances' },
  { id: 'edit_interventions_maintenance', label: '✏️ Modifier les entretiens/maintenances' },
  
  { id: 'view_interventions_repair', label: '🛠️ Voir les dépannages' },
  { id: 'create_interventions_repair', label: '➕ Créer des dépannages' },
  { id: 'edit_interventions_repair', label: '✏️ Modifier les dépannages' },
  
  { id: 'view_interventions_installation', label: '📦 Voir les montages/installations' },
  { id: 'create_interventions_installation', label: '➕ Créer des montages/installations' },
  { id: 'edit_interventions_installation', label: '✏️ Modifier les montages/installations' },
  
  { id: 'view_interventions_commissioning', label: '🚀 Voir les mises en service' },
  { id: 'create_interventions_commissioning', label: '➕ Créer des mises en service' },
  { id: 'edit_interventions_commissioning', label: '✏️ Modifier les mises en service' },
  
  // === PIÈCES DÉTACHÉES ===
  { id: 'view_spare_parts', label: '📦 Voir les pièces détachées' },
  { id: 'edit_spare_parts', label: '✏️ Gérer les pièces détachées' },
  
  // === ADMINISTRATION ===
  { id: 'view_users', label: '👤 Voir les utilisateurs' },
  { id: 'edit_users', label: '✏️ Gérer les utilisateurs' },
  { id: 'admin_access', label: '🔐 Accès administration (base de données, langues)' }
];

const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  'ADMINISTRATEUR': [
    'view_clients', 'edit_clients',
    'view_machines', 'edit_machines',
    'view_interventions_maintenance', 'create_interventions_maintenance', 'edit_interventions_maintenance',
    'view_interventions_repair', 'create_interventions_repair', 'edit_interventions_repair',
    'view_interventions_installation', 'create_interventions_installation', 'edit_interventions_installation',
    'view_interventions_commissioning', 'create_interventions_commissioning', 'edit_interventions_commissioning',
    'view_spare_parts', 'edit_spare_parts',
    'view_users', 'edit_users',
    'admin_access'
  ],
  
  'DIRECTEUR': [
    'view_clients', 'edit_clients',
    'view_machines', 'edit_machines',
    'view_interventions_maintenance', 'create_interventions_maintenance', 'edit_interventions_maintenance',
    'view_interventions_repair', 'create_interventions_repair', 'edit_interventions_repair',
    'view_interventions_installation', 'create_interventions_installation', 'edit_interventions_installation',
    'view_interventions_commissioning', 'create_interventions_commissioning', 'edit_interventions_commissioning',
    'view_spare_parts', 'edit_spare_parts',
    'view_users'
  ],
  
  'RESPONSABLE_TECHNIQUE': [
    'view_clients', 'edit_clients',
    'view_machines', 'edit_machines',
    'view_interventions_maintenance', 'create_interventions_maintenance', 'edit_interventions_maintenance',
    'view_interventions_repair', 'create_interventions_repair', 'edit_interventions_repair',
    'view_interventions_installation', 'view_interventions_commissioning',
    'view_spare_parts', 'edit_spare_parts',
    'view_users'
  ],
  
  'RESPONSABLE': [
    'view_clients',
    'view_machines',
    'view_interventions_maintenance', 'create_interventions_maintenance',
    'view_interventions_repair', 'create_interventions_repair',
    'view_interventions_installation',
    'view_spare_parts'
  ],
  
  'CHEF_TECHNICIEN_CMS': [
    'view_clients',
    'view_machines',
    'view_interventions_maintenance', 'create_interventions_maintenance', 'edit_interventions_maintenance',
    'view_interventions_repair', 'create_interventions_repair', 'edit_interventions_repair',
    'view_spare_parts'
  ],
  
  'CHEF_TECHNICIEN_VMS': [
    'view_clients',
    'view_machines',
    'view_interventions_maintenance', 'create_interventions_maintenance', 'edit_interventions_maintenance',
    'view_interventions_repair', 'create_interventions_repair', 'edit_interventions_repair',
    'view_spare_parts'
  ],
  
  'TECHNICIEN_CMS': [
    'view_clients',
    'view_machines',
    'view_interventions_maintenance', 'create_interventions_maintenance',
    'view_interventions_repair', 'create_interventions_repair',
    'view_spare_parts'
  ],
  
  'TECHNICIEN_VMS': [
    'view_clients',
    'view_machines',
    'view_interventions_maintenance', 'create_interventions_maintenance',
    'view_interventions_repair', 'create_interventions_repair',
    'view_spare_parts'
  ],
  
  'CHEF_MONTEUR': [
    'view_machines',
    'view_interventions_installation', 'create_interventions_installation', 'edit_interventions_installation',
    'view_interventions_commissioning', 'create_interventions_commissioning',
    'view_spare_parts'
  ],
  
  'MONTEUR': [
    'view_machines',
    'view_interventions_installation', 'create_interventions_installation',
    'view_spare_parts'
  ],
  
  'MAGASINIER': [
    'view_spare_parts', 'edit_spare_parts',
    'view_interventions_maintenance',
    'view_interventions_repair',
    'view_interventions_installation'
  ],
  
  'CLIENT': [
    'view_machines',
    'view_interventions_maintenance',
    'view_interventions_repair'
  ]
};

export function UsersScreen({ onNavigate }: UsersScreenProps) {
  // AJOUT: Récupération de l'utilisateur connecté
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [rolesPersonnalises, setRolesPersonnalises] = useState<string[]>([]);
  const [saisieRole, setSaisieRole] = useState('');
  const [showSaisieRole, setShowSaisieRole] = useState(false);
  
  // AJOUT: État local pour le bouton d'email (pour l'interface fluide)
  const [myEmailSetting, setMyEmailSetting] = useState(currentUser?.sendEmailReport !== false);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    numeroTechnicien: '',
    role: 'TECHNICIEN_CMS',
    roles: [] as string[],
    actif: true,
    sendEmailReport: true,
    permissions: [] as string[]
  });


  const roles = [
    { value: 'ADMINISTRATEUR', label: 'Administrateur' },
    { value: 'DIRECTEUR', label: 'Directeur' },
    { value: 'RESPONSABLE_TECHNIQUE', label: 'Responsable Technique' },
    { value: 'RESPONSABLE', label: 'Responsable / Supérieur' },
    { value: 'CHEF_TECHNICIEN_CMS', label: 'Chef Technicien CMS' },
    { value: 'CHEF_TECHNICIEN_VMS', label: 'Chef Technicien VMS' },
    { value: 'TECHNICIEN_CMS', label: 'Technicien CMS' },
    { value: 'TECHNICIEN_VMS', label: 'Technicien VMS' },
    { value: 'CHEF_MONTEUR', label: 'Chef Monteur' },
    { value: 'MONTEUR', label: 'Monteur' },
    { value: 'MAGASINIER', label: 'Magasinier' },
    { value: 'CLIENT', label: 'Client' }
  ];


    // MODIFICATION CRITIQUE : Synchroniser le bouton avec la LISTE UTILISATEURS (Source de vérité DB)
  useEffect(() => {
    // 1. On lance le chargement de la liste si ce n'est pas fait
    if (users.length === 0 && currentUser) {
      fetchUsers();
    }

    // 2. Une fois que la liste est chargée, on trouve "MOI" dedans
    if (currentUser && users.length > 0) {
      const myData = users.find(u => u.email === currentUser.email);
      
      // Si on se trouve dans la liste, on met à jour le bouton avec la valeur de la DB
      if (myData) {
        setMyEmailSetting(myData.sendEmailReport !== false);
        console.log("🔄 État du bouton synchronisé depuis la DB :", myData.sendEmailReport);
      }
    }
  }, [users, currentUser]); // Déclenche l'action dès que la liste users ou l'user connecté change


const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await api.entities.utilisateurs.list({ limit: 100 });
      
      // CORRECTION ICI : On force la création d'un nouveau tableau pour que React détecte le changement
      // même si l'API renvoie la même référence d'objet (problème de cache fréquent).
      setUsers([...(result.list || [])]); 
      
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  };

const handleToggleMyEmail = async () => {
    if (!currentUser || !currentUser.email) {
      alert('⚠️ Erreur : Impossible de vous identifier.');
      return;
    }
    const myDbRecord = users.find(u => u.email === currentUser.email);
    if (!myDbRecord || !myDbRecord._id) {
      alert('⚠️ Erreur : Utilisateur introuvable dans la liste.');
      return;
    }
    const newValue = !myEmailSetting;
    setMyEmailSetting(newValue);
    try {
      await api.entities.utilisateurs.update(myDbRecord._id, {
        sendEmailReport: newValue,
        updatedAt: new Date().toISOString()
      });
      await fetchUsers();
      alert(newValue ? '✅ Envoi des rapports ACTIVÉ.' : '🛑 Envoi des rapports DÉSACTIVÉ.');
    } catch (error) {
      console.error("❌ Erreur:", error);
      alert('❌ Erreur technique.');
      setMyEmailSetting(!newValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // On prend le premier rôle comme rôle principal
      const premierRole = formData.roles.length > 0 ? formData.roles[0] : formData.role;
      
      // Calcul des permissions basé sur TOUS les rôles sélectionnés
      const defaultPermissions = formData.roles.reduce((acc, r) => {
        return [...acc, ...(DEFAULT_PERMISSIONS_BY_ROLE[r] || [])];
      }, [] as string[]);
      
      // CORRECTION ICI : On s'assure que 'roles' est bien une chaîne de caractères (String)
      // conformément à ton schéma JSON "bsonType": "string".
      // Si formData.roles est vide, on utilise le rôle principal par défaut.
      const { roles: _roles, ...formDataSansRoles } = formData;
      const userData = {
        ...formDataSansRoles,
        role: formData.roles[0] || '',
        role2: formData.roles[1] || '',
        role3: formData.roles[2] || '',
        permissions: [...new Set([...formData.permissions, ...defaultPermissions])],
        creator: 'system',
        createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

console.log('💾 Sauvegarde utilisateur — role:', userData.role, '| roles:', userData.roles, '| permissions:', userData.permissions);

      console.log('🔍 userData complet:', JSON.stringify(userData, null, 2));
  if (editingUser) {
    const r1 = await api.entities.utilisateurs.update(editingUser._id, userData);
    const r2 = await api.entities.utilisateurs.update(editingUser._id, {
      role: userData.role,
      role2: userData.role2 || '',
      role3: userData.role3 || '',
    });
    console.log('📬 update1:', JSON.stringify(r1, null, 2));
    console.log('📬 update2:', JSON.stringify(r2, null, 2));
    const verify = await api.entities.utilisateurs.get(editingUser._id);
    console.log('🔎 DB après update — role:', verify?.role, '| role2:', verify?.role2, '| role3:', verify?.role3);
  }
       else {
        await api.entities.utilisateurs.create(userData);
      }
      
      // Cette ligne va appeler le fetchUsers modifié ci-dessus
      await fetchUsers(); 
      
      resetForm();
      alert(editingUser ? 'Utilisateur modifié !' : 'Utilisateur créé avec permissions par défaut !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

const filteredUsers = users.filter(user => 
    user.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.numeroTechnicien?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendInvitation = async (user: any) => {
    if (!user.email) { alert('Pas d\'email'); return; }
    const confirmed = confirm(`Envoyer l'invitation à ${user.email} ?`);
    if (!confirmed) return;
    setLoading(true);
    try {
      const appUrl = window.location.origin;
      const premierRole = (user.roles && user.roles.length > 0) ? user.roles[0] : user.role;
      const roleLabel = roles.find(r => r.value === premierRole)?.label || premierRole || 'Utilisateur';
      const response = await fetch('/api/legacy-lumi-functions/send-invitation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: user.email, recipientName: `${user.prenom} ${user.nom}`, userRole: roleLabel, appUrl })
      });
      if (!response.ok) throw new Error(`Erreur ${response.status}`);
      alert(`✅ Email d'invitation envoyé à ${user.email} !`);
    } catch (error) {
      alert(`Erreur : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {    setEditingUser(user);
    setFormData({
      nom: user.nom || '',
      prenom: user.prenom || '',
      email: user.email || '',
      telephone: user.telephone || '',
      numeroTechnicien: user.numeroTechnicien || '',
      role: user.role || 'TECHNICIEN_CMS',
      roles: [user.role, user.role2, user.role3].filter(Boolean),
      actif: user.actif !== false,
      sendEmailReport: user.sendEmailReport !== false,
      permissions: user.permissions || []
    });

    const rolesParDefaut = roles.map(r => r.value);
    const userRolesArray = Array.isArray(user.roles) ? user.roles 
      : (typeof user.roles === 'string' && user.roles ? user.roles.split(',') : []);
    const personnalises = userRolesArray.filter((r: string) => !rolesParDefaut.includes(r));
    setRolesPersonnalises(prev => {
      const tous = [...prev, ...personnalises];
      return [...new Set(tous)];
    });

    setShowSaisieRole(false);
    setSaisieRole('');
    setShowForm(true);
  };


  const handleDelete = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    setLoading(true);
    try {
      await api.entities.utilisateurs.delete(userId);
      await fetchUsers();
      alert('Utilisateur supprimé !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };


  const handlePermissionToggle = async (userId: string, permissionId: string) => {
    try {
      const user = users.find(u => u._id === userId);
      if (!user) return;

      const currentPermissions = user.permissions || [];
      const hasPermission = currentPermissions.includes(permissionId);
      
      const updatedPermissions = hasPermission
        ? currentPermissions.filter((p: string) => p !== permissionId)
        : [...currentPermissions, permissionId];

      await api.entities.utilisateurs.update(userId, {
        permissions: updatedPermissions,
        updatedAt: new Date().toISOString()
      });

      setUsers(prevUsers => 
        prevUsers.map(u => 
          u._id === userId 
            ? { ...u, permissions: updatedPermissions }
            : u
        )
      );
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour des permissions');
    }
  };


  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      numeroTechnicien: '',
      role: 'TECHNICIEN_CMS',
      roles: [],
      actif: true,
      sendEmailReport: true,
      permissions: []
    });
    setEditingUser(null);
    setShowForm(false);
  };


  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-600 mt-1">Gérez les utilisateurs et leurs rôles</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 w-full md:w-auto">
            <Plus size={20} />
            Nouvel utilisateur
          </Button>
        )}
      </div>

      {/* MODIFICATION: Bouton Global Email AU DESSUS de la recherche */}
      {!showForm && (
        <Card className={`border-l-4 ${myEmailSetting ? 'border-green-500 bg-green-50' : 'border-gray-400 bg-gray-100'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${myEmailSetting ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                <Mail size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Envoi des rapports fin d'intervention</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Statut actuel : <span className={`font-bold ${myEmailSetting ? 'text-green-700' : 'text-gray-700'}`}>
                    {myEmailSetting ? 'ACTIVÉ (Client recevra le mail)' : 'DÉSACTIVÉ (Client ne recevra pas le mail)'}
                  </span>
                </p>
              </div>
            </div>
            <Button
              onClick={handleToggleMyEmail}
              className={`${myEmailSetting ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white w-full sm:w-auto`}
            >
              {myEmailSetting ? 'Désactiver l\'envoi' : 'Activer l\'envoi'}
            </Button>
          </div>
        </Card>
      )}

      {/* Recherche */}
      {!showForm && (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un utilisateur..."
          className="w-full md:max-w-md"
        />
      )}

      {/* Formulaire */}
      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                <X size={20} />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nom"
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                required
              />
              <Input
                label="Prénom"
                value={formData.prenom}
                onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
              <Input
                label="Téléphone"
                value={formData.telephone}
                onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
              />
              <Input
                label="N° Technicien"
                value={formData.numeroTechnicien}
                onChange={(e) => setFormData(prev => ({ ...prev, numeroTechnicien: e.target.value }))}
                placeholder="Ex: TECH001"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôles</label>

                {formData.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.roles.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                        {[...roles, ...rolesPersonnalises.map(rp => ({ value: rp, label: rp.replace(/_/g, ' ') }))].find(ro => ro.value === r)?.label || r}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            roles: prev.roles.filter(ro => ro !== r),
                            role: prev.roles.filter(ro => ro !== r)[0] || ''
                          }))}
                          className="text-blue-400 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {!showSaisieRole && (
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__nouveau__') {
                        setShowSaisieRole(true);
                      } else if (val && !formData.roles.includes(val)) {
                        setFormData(prev => ({
                          ...prev,
                          roles: [...prev.roles, val],
                          role: prev.roles.length === 0 ? val : prev.role
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">+ Ajouter un rôle...</option>
                    {roles
                      .filter(r => !formData.roles.includes(r.value))
                      .map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))
                    }
                    {rolesPersonnalises
                      .filter(r => !formData.roles.includes(r) && !roles.find(ro => ro.value === r))
                      .map(r => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))
                    }
                    <option value="__nouveau__">✏️ Créer un nouveau rôle...</option>
                  </select>
                )}

                {showSaisieRole && (
                  <div className="p-3 border border-blue-300 rounded-lg bg-blue-50 space-y-2">
                    <p className="text-xs text-blue-700 font-semibold">Tapez un nom et appuyez Entrée. Vous pouvez en créer plusieurs avant de fermer.</p>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={saisieRole}
                        onChange={(e) => setSaisieRole(e.target.value)}
                        placeholder="Ex: Électricien général..."
                        className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const texte = saisieRole.trim();
                            if (!texte) return;

                            const valeur = texte
                              .toUpperCase()
                              .normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .replace(/\s+/g, '_');

                            if (valeur && !formData.roles.includes(valeur)) {
                              setRolesPersonnalises(prev => [...new Set([...prev, valeur])]);
                              setFormData(prev => ({
                                ...prev,
                                roles: [...prev.roles, valeur],
                                role: prev.roles.length === 0 ? valeur : prev.role
                              }));
                            }
                            setSaisieRole('');
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const texte = saisieRole.trim();
                        if (!texte) return;
                        const valeur = texte
                          .toUpperCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/\s+/g, '_');
                        if (valeur && !formData.roles.includes(valeur)) {
                          setRolesPersonnalises(prev => [...new Set([...prev, valeur])]);
                          setFormData(prev => ({
                            ...prev,
                            roles: [...prev.roles, valeur],
                            role: prev.roles.length === 0 ? valeur : prev.role
                          }));
                        }
                        setSaisieRole('');
                      }}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold"
                    >
                      + Ajouter ce rôle
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSaisieRole(false);
                        setSaisieRole('');
                      }}
                      className="w-full text-xs text-blue-600 hover:text-blue-800 py-1 border border-blue-200 rounded bg-white"
                    >
                      ✓ Fermer la saisie
                    </button>
                  </div>
                )}

                {formData.roles.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">⚠️ Au moins un rôle est requis</p>
                )}

                {/* ✅ AJOUT : Affichage des permissions automatiques */}
                {formData.roles.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <strong>ℹ️ Permissions automatiques pour ce rôle :</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(DEFAULT_PERMISSIONS_BY_ROLE[formData.roles[0]] || []).map(perm => (
                        <span key={perm} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {PERMISSIONS.find(p => p.id === perm)?.label || perm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Zone des cases à cocher globales */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
               <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="actif"
                  checked={formData.actif}
                  onChange={(e) => setFormData(prev => ({ ...prev, actif: e.target.checked }))}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="actif" className="text-sm font-medium text-gray-700">
                  Compte actif
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmailReport"
                  checked={formData.sendEmailReport}
                  onChange={(e) => setFormData(prev => ({ ...prev, sendEmailReport: e.target.checked }))}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="sendEmailReport" className="text-sm font-medium text-gray-700">
                  Activer l'envoi automatique du rapport de fin d'intervention
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="ghost" onClick={resetForm}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="flex items-center gap-2">
                <Save size={20} />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Liste des utilisateurs */}
      {!showForm && (
        <>
          {loading ? (
            <Card className="text-center py-12">
              <p className="text-gray-500">Chargement...</p>
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur enregistré'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user._id} className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">
                          {user.prenom?.charAt(0)}{user.nom?.charAt(0)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">
                          {user.prenom} {user.nom}
                        </h3>
                        
                        <button
                          onClick={() => handleSendInvitation(user)}
                          disabled={!user.email}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate text-left disabled:text-gray-400 disabled:cursor-not-allowed block"
                          title={user.email ? "Cliquer pour envoyer l'invitation" : "Pas d'email"}
                        >
                          {user.email || 'Pas d\'email'}
                        </button>
                        
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {[user.role, user.role2, user.role3].filter(Boolean).map((r: string) => (
                            <span key={r} className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                              {roles.find(ro => ro.value === r)?.label || r}
                            </span>
                          ))}
                          {user.numeroTechnicien && (
                            <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                              {user.numeroTechnicien}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto justify-end sm:justify-end mt-2 sm:mt-0 self-end sm:self-center">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
<div className="flex items-center">
  <button
    onClick={() => handleSendInvitation(user)}
    disabled={!user.email}
    className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    title={user.email ? "Envoyer l'invitation" : "Pas d'email"}
  >
    <Mail size={18} />
  </button>
{user.hasAccount && (
  <CheckCircle size={14} className="text-green-500 -ml-1" title="Compte créé ✓" />
)}</div>      
               <button
                        onClick={() => handleDelete(user._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedUserId(expandedUserId === user._id ? null : user._id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 mt-3 sm:mt-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-xs"
                  >
                    <span className="font-medium text-gray-700">
                      {(user.permissions || []).length} permission(s) active(s)
                    </span>
                    {expandedUserId === user._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {expandedUserId === user._id && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2 p-3 bg-gray-50 rounded-lg">
                      {PERMISSIONS.map((permission) => {
                        const hasPermission = (user.permissions || []).includes(permission.id);
                        return (
                          <label
                            key={permission.id}
                            className="flex items-start gap-2 text-xs cursor-pointer hover:bg-white p-1.5 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={hasPermission}
                              onChange={() => handlePermissionToggle(user._id, permission.id)}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
                            />
                            <span className="text-gray-700 leading-tight">{permission.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}