import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface User {
  userId: string;
  email: string;
  userName?: string;
}

export interface UserData {
  _id: string;
  nom: string;
  prenom: string;
  email: string;
  role?: string;
  roles?: string[];
  actif: boolean;
  clientId?: string;           // Pour les utilisateurs de type CLIENT
  numero_technicien?: string;
  numeroTechnicien?: string;
  permissions?: string[];      // Liste de permissions sous forme de strings
  // Permissions legacy (objet)
  permissionsObj?: {
    canValidateSections?: boolean;
    canValidateMaintenanceSections?: boolean;
    canCreateInterventions?: boolean;
    canEditClients?: boolean;
    canEditMachines?: boolean;
    canManageUsers?: boolean;
    canAccessReports?: boolean;
  };
}

export interface ClientData {
  _id: string;
  nom: string;
  prenom?: string;
  email: string;
  ferme?: string;
  adresse?: string;
  telephone?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // ✅ Compatible avec api.auth.getUser (nouveau) ET api.auth.refreshUser (ancien)
      let currentUser: any = null;
      if (typeof api.auth.getUser === 'function') {
        currentUser = await api.auth.getUser();
      } else if (typeof api.auth.refreshUser === 'function') {
        currentUser = await api.auth.refreshUser();
      }

      if (!currentUser) {
        setUser(null);
        setUserData(null);
        setClientData(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // 1. Chercher dans la table utilisateurs
      const userResult = await api.entities.utilisateurs.list({
        filter: { email: currentUser.email },
        limit: 1
      });

if (userResult.list && userResult.list.length > 0) {
  const u = userResult.list[0];
  if (typeof u.roles === 'string') {
    u.roles = u.roles.split(',').filter(Boolean);
  } else if (u.role && !u.roles) {
    u.roles = [u.role];
  }
  // Marquer que l'utilisateur a créé/activé son compte
if (!u.hasAccount) {
  await api.entities.utilisateurs.update(u._id, { hasAccount: true });
  u.hasAccount = true;
}  setUserData(u);        setClientData(null);
        console.log('[useAuth] Utilisateur trouvé:', u.prenom, u.nom, '| roles:', u.roles);

        // ── Suivi de connexion (base espion) ────────────────────────────────────
        // Non bloquant : on lance le suivi en arrière-plan sans l'attendre
        (async () => {
          try {
            const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
            const cutoffDate = new Date();
            cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
            const cutoff = cutoffDate.toISOString().slice(0, 10); // "YYYY-MM-DD"

            // 1. Enregistrer la connexion du jour si elle n'existe pas encore
            const existing = await api.entities.user_connections.list({
              filter: { userId: u._id, date: today },
              limit: 1
            });
            if (!existing.list || existing.list.length === 0) {
              await api.entities.user_connections.create({
                userId: u._id,
                userEmail: u.email,
                userName: `${u.prenom || ''} ${u.nom || ''}`.trim(),
                userRole: u.role || (Array.isArray(u.roles) ? u.roles[0] : ''),
                date: today,
                timestamp: new Date().toISOString()
              });

              // 2. Purge des entrées de plus d'un an
              try {
                const old = await api.entities.user_connections.list({
                  filter: { userId: u._id, date: { $lt: cutoff } },
                  limit: 100
                });
                if (old.list && old.list.length > 0) {
                  await Promise.allSettled(
                    old.list.map((entry: any) => api.entities.user_connections.delete(entry._id))
                  );
                  console.log(`[useAuth] Purge historique connexions : ${old.list.length} entrées supprimées (< ${cutoff})`);
                }
              } catch (purgeErr) {
                console.warn('[useAuth] Purge connexions ignorée:', purgeErr);
              }
            }
          } catch (trackErr) {
            console.warn('[useAuth] Suivi connexion ignoré:', trackErr);
          }
        })();
        // ────────────────────────────────────────────────────────────────────────

        setLoading(false);
        return;
      }

      console.log('[useAuth] Aucune fiche utilisateur pour:', currentUser.email);

      // 2. Chercher dans la table clients
      const clientResult = await api.entities.clients.list({
        filter: { email: currentUser.email },
        limit: 1
      });

      if (clientResult.list && clientResult.list.length > 0) {
        const c = clientResult.list[0];
        setClientData(c);

        // Créer un userData minimal pour les CLIENTs
        // App.tsx se base sur userData.roles et userData.clientId
        setUserData({
          _id: currentUser.userId || '',
          nom: c.nom || '',
          prenom: c.prenom || '',
          email: currentUser.email,
          role: 'CLIENT',
          roles: ['CLIENT'],
          clientId: c._id,         // ✅ clé utilisée par App.tsx
          actif: true,
          permissions: []
        });

        console.log('[useAuth] Client sans fiche utilisateurs - accès minimal accordé, clientId:', c._id);
      } else {
        console.log('[useAuth] Fallback sur currentUser pour:', currentUser.email);
        setUserData({
          _id: currentUser.id || currentUser.userId || '',
          nom: currentUser.name || 'Admin',
          prenom: '',
          email: currentUser.email,
          role: currentUser.role || 'ADMIN',
          roles: [currentUser.role || 'ADMIN'],
          actif: true,
          permissions: []
        });
      }

    } catch (error) {
      console.error('[useAuth] Erreur checkAuth:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await api.auth.signInWithPassword({ email, password });
      await checkAuth();
    } catch (error) {
      console.error('[useAuth] Erreur signIn:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await api.auth.signUpWithPassword({ email, password });
      await checkAuth();
    } catch (error) {
      console.error('[useAuth] Erreur signUp:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await api.auth.signOut();
      setUser(null);
      setUserData(null);
      setClientData(null);
    } catch (error) {
      console.error('[useAuth] Erreur signOut:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  // ─── Helpers utilisés dans App.tsx ───────────────────────────────────────────

  /** Retourne le tableau de rôles normalisé de l'utilisateur */
  const getRoles = (u: UserData): string[] => u.roles || (u.role ? [u.role] : []);

  /**
   * Vérifie si l'utilisateur a une permission donnée.
   * Supporte : permissions[] (strings), permissionsObj (booléens), et role admin.
   */
  const hasPermission = (permissionId: string): boolean => {
    if (!userData) return false;

    const roles = getRoles(userData);
    if (roles.includes('ADMIN') || roles.includes('admin') || roles.includes('ADMINISTRATEUR')) return true;

    // CLIENT n'a aucune permission technicien
    if (roles.includes('CLIENT')) return false;

    // Permissions sous forme de tableau de strings
    if (userData.permissions && Array.isArray(userData.permissions)) {
      if (userData.permissions.includes(permissionId)) return true;
    }

    // Permissions legacy sous forme d'objet booléen
    const permMap: Record<string, string> = {
      view_clients:                        'canEditClients',
      edit_clients:                        'canEditClients',
      view_machines:                       'canEditMachines',
      edit_machines:                       'canEditMachines',
      view_users:                          'canManageUsers',
      view_interventions_maintenance:      'canCreateInterventions',
      create_interventions_maintenance:    'canCreateInterventions',
      edit_interventions_maintenance:      'canCreateInterventions',
      view_interventions_repair:           'canCreateInterventions',
      create_interventions_repair:         'canCreateInterventions',
      edit_interventions_repair:           'canCreateInterventions',
      view_interventions_installation:     'canCreateInterventions',
      create_interventions_installation:   'canCreateInterventions',
      edit_interventions_installation:     'canCreateInterventions',
      view_interventions_commissioning:    'canCreateInterventions',
      create_interventions_commissioning:  'canCreateInterventions',
      edit_interventions_commissioning:    'canCreateInterventions',
      view_spare_parts:                    'canAccessReports',
      edit_spare_parts:                    'canAccessReports',
    };

    const legacyKey = permMap[permissionId];
    if (legacyKey && userData.permissionsObj) {
      return !!(userData.permissionsObj as any)[legacyKey];
    }

    // Fallback : si pas de permissions définies du tout, on autorise (technicien sans config)
    const hasNoPermConfig =
      (!userData.permissions || userData.permissions.length === 0) &&
      !userData.permissionsObj;

    return hasNoPermConfig;
  };

  /** Retourne true si l'utilisateur est admin */
  const isAdmin = (): boolean => {
    if (!userData) return false;
    const roles = getRoles(userData);
    return roles.includes('ADMIN') || roles.includes('admin') || roles.includes('ADMINISTRATEUR');
  };

  /** Retourne true si l'utilisateur est un client final */
  const isClientUser = (): boolean => {
    if (!userData) return false;
    const roles = getRoles(userData);
    return roles.includes('CLIENT');
  };

  return {
    user,
    userData,
    clientData,
    loading,
    // Helpers App.tsx
    hasPermission,
    isAdmin,
    isClient: isClientUser,   // App.tsx appelle isClient()
    // Actions
    signIn,
    signUp,
    signOut,
    refreshUser
  };
}