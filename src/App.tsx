//App.tsx
import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { useAuth } from './hooks/useAuth';
import { LoginScreen } from './components/auth/LoginScreen';
import { Layout } from './components/common/Layout';
import { Dashboard } from './screens/Dashboard';
import { ClientsScreen } from './screens/clients/ClientsScreen';
import { MachinesScreen } from './screens/machines/MachinesScreen';
import { MachineDetailScreen } from './screens/machines/MachineDetailScreen';
import { InterventionsScreen } from './screens/interventions/InterventionsScreen';
import { InterventionFormScreen } from './screens/interventions/InterventionFormScreen';
import { InterventionDetailScreen } from './screens/interventions/InterventionDetailScreen';
import { MaintenanceSectionSelectionScreen } from './screens/interventions/MaintenanceSectionSelectionScreen';
import { MaintenanceExecutionScreen } from './screens/interventions/MaintenanceExecutionScreen';
import { MaintenanceInterventionScreen } from './screens/interventions/MaintenanceInterventionScreen';
import { MaintenanceHistoryView } from './screens/interventions/MaintenanceHistoryView';
import { SparePartsScreen } from './screens/spare-parts/SparePartsScreen';
import { TroubleshootingScreen } from './screens/help/TroubleshootingScreen';
import { ClientDetailScreen } from './screens/clients/ClientDetailScreen';
import { ClientPortalScreen } from './screens/clients/ClientPortalScreen';
import { UsersScreen } from './screens/users/UsersScreen';
import { ClientFormScreen } from './screens/clients/ClientFormScreen';
import { MachineFormScreen } from './screens/machines/MachineFormScreen';
import { SparePartFormScreen } from './screens/spare-parts/SparePartFormScreen';
import { SparePartDetailScreen } from './screens/spare-parts/SparePartDetailScreen';
import { MaintenanceScreen } from './screens/maintenance/MaintenanceScreen';
import { MaintenanceKitSelectionScreen } from './screens/maintenance/MaintenanceKitSelectionScreen';
import { MaintenanceMonitoringScreen } from './screens/maintenance/MaintenanceMonitoringScreen';
import { MultiMachineKitSelectionScreen } from './screens/interventions/MultiMachineKitSelectionScreen';
import { MultiMachineSectionSelectionScreen } from './screens/interventions/MultiMachineSectionSelectionScreen';
import { TaskExecutionScreen } from './screens/interventions/TaskExecutionScreen';
import { DatabaseAdminScreen } from './screens/admin/DatabaseAdminScreen';
import { LanguageConfigScreen } from './screens/admin/LanguageConfigScreen';
import { TranslationEditorScreen } from './screens/admin/TranslationEditorScreen';
import { CommissioningProtocolScreen } from './screens/interventions/CommissioningProtocolScreen';
import { InstallationProtocolScreen } from './screens/interventions/InstallationProtocolScreen';
import { DebugFileOverlay } from './components/common/DebugFileOverlay';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { useMachines } from './hooks/useMachines';
import { useInterventions } from './hooks/useInterventions';
import { useClients } from './hooks/useClients';

function AccessDenied({ screen }: { screen: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h2>
        <p className="text-gray-600 mb-4">
          Vous n'avez pas la permission d'accéder à cette section.
        </p>
        <p className="text-sm text-gray-500">
          Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<string>('clients');
  const [screenParams, setScreenParams] = useState<any>({});

  const { user, hasPermission, isAdmin, isClient, userData, loading: authLoading, checkAuth } = useAuth() as any; // Cast for now if checkAuth is not typed
  const isAuthenticated = !!user;

  // Hooks de données pour le rafraîchissement automatique
  const { fetchMachines } = useMachines();
  const { fetchInterventions } = useInterventions();
  const { fetchClients } = useClients();

  // Rafraîchit les données quand l'utilisateur revient sur l'app (focus / visibilité)
  useAutoRefresh({
    onRefresh: () => {
      fetchMachines();
      fetchInterventions();
      fetchClients();
    },
    minInterval: 60_000,
  });

  /** Retourne true si l'utilisateur connecté est un CLIENT */
  const roleIsClient = !!(userData?.roles?.includes('CLIENT') || userData?.role === 'CLIENT');
 

  // ✅ CLIENT → ClientPortalScreen (pas ClientDetailScreen)
  useEffect(() => {
    if (authLoading) return;
    if (!userData) return;
    if (!isAuthenticated) return;

    if (roleIsClient) {
      setCurrentScreen('client-portal');
      setScreenParams({});
    }
  }, [authLoading, userData, isAuthenticated]);

  const handleNavigate = (screen: string, params?: any) => {
    setCurrentScreen(screen);
    setScreenParams(params || {});
  };

  const handleLoginSuccess = async () => {
    if (checkAuth) await checkAuth();
    else window.location.reload();
  };

  const handleLogout = async () => {
    await api.auth.signOut();
    window.location.reload();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Chargement de l'application...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const checkPermission = (permissionId: string): boolean => {
    const hasAccess = hasPermission(permissionId);
    if (!hasAccess) {
      console.warn(`🔒 Accès refusé à ${permissionId} pour ${userData?.prenom} ${userData?.nom}`);
    }
    return hasAccess;
  };

  const hasAnyInterventionPermission = (type: 'view' | 'create' | 'edit'): boolean => {
    return (
      hasPermission(`${type}_interventions_maintenance`) ||
      hasPermission(`${type}_interventions_repair`) ||
      hasPermission(`${type}_interventions_installation`) ||
      hasPermission(`${type}_interventions_commissioning`)
    );
  };

  const renderScreen = () => {
    // CLIENT → écrans autorisés uniquement
    if (roleIsClient) {
      // machine-detail en mode client
      if (currentScreen === 'machine-detail') {
        return (
          <MachineDetailScreen
            onNavigate={handleNavigate}
            machineId={screenParams.machineId}
            clientId={screenParams.clientId ?? userData?.clientId}
            clientView={true}
          />
        );
      }
      // Tout le reste → portail client, on passe clientId depuis userData
      return <ClientPortalScreen onNavigate={handleNavigate} clientId={userData?.clientId} />;
    }

    // Si userData pas encore chargé et qu'on est authentifié → attendre
    if (isAuthenticated && !userData) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Chargement du profil...</p>
        </div>
      );
    }

    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;

      // CLIENTS
      case 'clients':
        if (!checkPermission('view_clients')) return <AccessDenied screen="clients" />;
        return <ClientsScreen onNavigate={handleNavigate} />;

      case 'client-detail':
        if (!checkPermission('view_clients')) return <AccessDenied screen="client-detail" />;
        return (
          <ClientDetailScreen
            key={`client-detail-${screenParams.clientId}`}
            onNavigate={handleNavigate}
            clientId={screenParams.clientId}
          />
        );

      case 'client-portal':
        return <ClientPortalScreen onNavigate={handleNavigate} />;

     case 'client-form':
        if (!checkPermission('edit_clients')) return <AccessDenied screen="client-form" />;
        return (
          <ClientFormScreen
            onNavigate={handleNavigate}
            clientId={screenParams?.clientId}
            returnTo={screenParams?.returnTo}
            returnParams={screenParams?.returnParams}
          />
        );
      // MACHINES
      case 'machines':
        if (!checkPermission('view_machines')) return <AccessDenied screen="machines" />;
        return <MachinesScreen onNavigate={handleNavigate} clientId={screenParams?.clientId} />;

      // ✅ machine-detail : passe clientView depuis les params
      case 'machine-detail':
        if (!checkPermission('view_machines')) return <AccessDenied screen="machine-detail" />;
        return (
          <MachineDetailScreen
            onNavigate={handleNavigate}
            machineId={screenParams.machineId}
            clientId={screenParams.clientId}
            clientView={screenParams.clientView ?? false}
          />
        );

      case 'client-machine-detail':
        if (!checkPermission('view_machines')) return <AccessDenied screen="client-machine-detail" />;
        return (
          <MachineDetailScreen
            onNavigate={handleNavigate}
            machineId={screenParams.machineId}
            clientId={screenParams.clientId}
          />
        );

      case 'machine-form':
        if (!checkPermission('edit_machines')) return <AccessDenied screen="machine-form" />;
        return (
          <MachineFormScreen
            onNavigate={handleNavigate}
            machineId={screenParams?.machineId}
            clientId={screenParams?.clientId}
          />
        );

      // INTERVENTIONS
      case 'interventions':
        if (!hasAnyInterventionPermission('view')) return <AccessDenied screen="interventions" />;
        return <InterventionsScreen onNavigate={handleNavigate} />;

case 'intervention-form':
        if (!hasAnyInterventionPermission('create')) return <AccessDenied screen="intervention-form" />;
        return (
          <InterventionFormScreen
            onNavigate={handleNavigate}
            interventionId={screenParams.interventionId}
            clientId={screenParams?.clientId}
            machineId={screenParams?.machineId}
            maintenanceSelectionData={screenParams?.maintenanceSelectionData}
            readOnly={screenParams?.readOnly}
            returnTo={screenParams?.returnTo}
            returnParams={screenParams?.returnParams}
          />
        );

      case 'intervention-detail':
        if (!hasAnyInterventionPermission('view')) return <AccessDenied screen="intervention-detail" />;
        return (
          <InterventionDetailScreen
            onNavigate={handleNavigate}
            interventionId={screenParams.interventionId}
            returnTo={screenParams.returnTo}
            returnParams={screenParams.returnParams}
          />
        );

      case 'maintenance-history-view':
        if (!hasAnyInterventionPermission('view')) return <AccessDenied screen="maintenance-history-view" />;
        return <MaintenanceHistoryView onNavigate={handleNavigate} intervention={screenParams?.intervention} />;

      case 'maintenance-intervention':
        if (!hasAnyInterventionPermission('create')) return <AccessDenied screen="maintenance-intervention" />;
        return <MaintenanceInterventionScreen onNavigate={handleNavigate} clientId={screenParams?.clientId || ''} />;

      case 'maintenance-section-selection':
        if (!hasAnyInterventionPermission('create')) return <AccessDenied screen="maintenance-section-selection" />;
        return (
          <MaintenanceSectionSelectionScreen
            onNavigate={handleNavigate}
            machines={screenParams?.machines || []}
            clientId={screenParams?.clientId || ''}
            onConfirm={(selectionData) => {
              handleNavigate('intervention-form', {
                ...screenParams?.formData,
                maintenanceSelectionData: selectionData
              });
            }}
          />
        );

      case 'multi-machine-kit-selection':
        if (!hasAnyInterventionPermission('create')) return <AccessDenied screen="multi-machine-kit-selection" />;
        return (
          <MultiMachineKitSelectionScreen
            onNavigate={handleNavigate}
            clientId={screenParams?.clientId || ''}
            machineIds={screenParams?.machineIds || []}
          />
        );

      case 'multi-machine-section-selection':
        if (!hasAnyInterventionPermission('create')) return <AccessDenied screen="multi-machine-section-selection" />;
        return (
          <MultiMachineSectionSelectionScreen
            key={`sections-${Date.now()}`}
            onNavigate={handleNavigate}
            clientId={screenParams?.clientId}
            machineKitSelections={screenParams?.machineKitSelections || []}
            updatedSectionsData={screenParams?.updatedSectionsData}
            resumeInterventionId={screenParams?.resumeInterventionId}
            savedSectionsState={screenParams?.savedSectionsState}
            onConfirm={(sectionsData) => {
              if (screenParams?.resumeInterventionId) {
                handleNavigate('maintenance-execution', {
                  interventionId: screenParams.resumeInterventionId,
                  interventionData: {
                    sectionsData,
                    clientId: screenParams.clientId
                  }
                });
              } else {
                handleNavigate('intervention-form', {
                  clientId: screenParams.clientId,
                  maintenanceSelectionData: sectionsData
                });
              }
            }}
          />
        );

      case 'task-execution':
        if (!hasAnyInterventionPermission('create')) return <AccessDenied screen="task-execution" />;
        return (
          <TaskExecutionScreen
            onNavigate={handleNavigate}
            machineId={screenParams?.machineId}
            kitId={screenParams?.kitId}
            sectionName={screenParams?.sectionName}
            sectionsData={screenParams?.sectionsData}
            machineKitSelections={screenParams?.machineKitSelections}
            clientId={screenParams?.clientId}
            resumeInterventionId={screenParams?.resumeInterventionId}
            savedSectionsState={screenParams?.savedSectionsState}
          />
        );

      case 'maintenance-execution':
        if (!hasAnyInterventionPermission('view')) return <AccessDenied screen="maintenance-execution" />;
        return (
          <MaintenanceExecutionScreen
            onNavigate={handleNavigate}
            interventionId={screenParams?.interventionId || ''}
            interventionData={screenParams?.existingIntervention || screenParams?.interventionData}
            readOnly={screenParams?.readOnly}
          />
        );

      // PIÈCES DÉTACHÉES
      case 'spare-parts':
        if (!checkPermission('view_spare_parts')) return <AccessDenied screen="spare-parts" />;
        return <SparePartsScreen onNavigate={handleNavigate} />;

      case 'spare-part-form':
        if (!checkPermission('edit_spare_parts')) return <AccessDenied screen="spare-part-form" />;
        return <SparePartFormScreen onNavigate={handleNavigate} sparePartId={screenParams?.sparePartId} />;

      case 'spare-part-detail':
        if (!checkPermission('view_spare_parts')) return <AccessDenied screen="spare-part-detail" />;
        return <SparePartDetailScreen onNavigate={handleNavigate} partId={screenParams?.partId} />;

      // MAINTENANCE
      case 'maintenance':
        if (!hasAnyInterventionPermission('view')) return <AccessDenied screen="maintenance" />;
        return <MaintenanceScreen onNavigate={handleNavigate} machineId={screenParams?.machineId} kitId={screenParams?.kitId} />;

      case 'maintenance-kit-selection':
        if (!hasAnyInterventionPermission('view')) return <AccessDenied screen="maintenance-kit-selection" />;
        return <MaintenanceKitSelectionScreen onNavigate={handleNavigate} machineId={screenParams?.machineId} />;

      case 'maintenance-monitoring':
        if (!hasAnyInterventionPermission('view')) return <AccessDenied screen="maintenance-monitoring" />;
        return <MaintenanceMonitoringScreen onNavigate={handleNavigate} />;

      // TROUBLESHOOTING
      case 'troubleshooting':
        if (!hasAnyInterventionPermission('view')) return <AccessDenied screen="troubleshooting" />;
        return (
          <TroubleshootingScreen
            onNavigate={handleNavigate}
            interventionId={screenParams?.interventionId}
            clientId={screenParams?.clientId}
            machineId={screenParams?.machineId}
          />
        );

      // UTILISATEURS
      case 'users':
        if (!checkPermission('view_users')) return <AccessDenied screen="users" />;
        return <UsersScreen onNavigate={handleNavigate} />;

      // ADMIN
      case 'database-admin':
        if (!isAdmin()) return <AccessDenied screen="database-admin" />;
        return <DatabaseAdminScreen onNavigate={handleNavigate} />;

      case 'language-config':
        if (!isAdmin()) return <AccessDenied screen="language-config" />;
        return <LanguageConfigScreen onNavigate={handleNavigate} />;

      case 'translation-editor':
        if (!isAdmin()) return <AccessDenied screen="translation-editor" />;
        return <TranslationEditorScreen onNavigate={handleNavigate} />;

      // PROTOCOLES
      case 'commissioning-protocol':
        if (!hasPermission('view_interventions_commissioning')) return <AccessDenied screen="commissioning-protocol" />;
        return (
          <CommissioningProtocolScreen
            onNavigate={handleNavigate}
            interventionId={screenParams?.interventionId}
            clientId={screenParams?.clientId}
            machineId={screenParams?.machineId}
            readOnly={screenParams?.readOnly}
            clientName={screenParams?.clientName}
            machineName={screenParams?.machineName}
          />
        );

      case 'installation-protocol':
        if (!hasPermission('view_interventions_installation')) return <AccessDenied screen="installation-protocol" />;
        return (
          <InstallationProtocolScreen
            onNavigate={handleNavigate}
            interventionId={screenParams?.interventionId}
            clientId={screenParams?.clientId}
            machineId={screenParams?.machineId}
          />
        );

      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout onNavigate={handleNavigate} onLogout={handleLogout} currentScreen={currentScreen}>
      {renderScreen()}
      <DebugFileOverlay currentScreen={currentScreen} />
      <PWAInstallBanner />
    </Layout>
  );
}