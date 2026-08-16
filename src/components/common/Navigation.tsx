import React, { useState } from 'react';
import {Users, Wrench, FileText, Package, HelpCircle, Settings, Database, Menu, X, Bell} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useMaintenanceMonitoring } from '../../hooks/useMaintenanceMonitoring';
import { useAuth } from '../../hooks/useAuth';


interface NavigationProps {
  onNavigate?: (screen: string) => void;
  currentScreen?: string;
}


export function Navigation({ onNavigate, currentScreen }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { alerts } = useMaintenanceMonitoring();
  const { userData } = useAuth();
  const urgentCount = alerts.filter(a => a.status === '🔴' || a.status === '🟠').length;

  const userRoles = [
    userData?.role,
    userData?.role2,
    userData?.role3,
    ...(Array.isArray(userData?.roles) ? userData.roles : [])
  ].filter(Boolean) as string[];

  const canSeeMonitoring = userRoles.some(r =>
    ['ADMINISTRATEUR', 'RESPONSABLE_TECHNIQUE', 'TECHNICIEN_VMS', 'TECHNICIEN_CMS', 'CHEF_TECHNICIEN_VMS', 'CHEF_TECHNICIEN_CMS', 'Technicien VMS', 'Technicien CMS'].includes(r)
  );

  const menuItems = [
    { id: 'clients', labelKey: 'clients.title', icon: Users },
    { id: 'interventions', labelKey: 'interventions.title', icon: FileText },
    { id: 'spare-parts', labelKey: 'spare_parts.title', icon: Package },
    ...(canSeeMonitoring ? [{ id: 'maintenance-monitoring', labelKey: 'maintenance.monitoring', icon: Bell, label: 'Surveillance' }] : []),
    { id: 'maintenance', labelKey: 'maintenance.title', icon: Settings },
    { id: 'troubleshooting', labelKey: 'troubleshooting.title', icon: HelpCircle },
    { id: 'users', labelKey: 'users.title', icon: Users },
    { id: 'database-admin', labelKey: 'administration.title', icon: Database },
  ];


  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-white border-r border-gray-200 z-50">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-6">
            <h1 className="text-xl font-bold text-blue-600">SoplanElevage</h1>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  className={`
                    group flex items-center w-full px-3 py-2 text-sm font-medium rounded-md
                    transition-colors duration-200
                    ${isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <div className="relative mr-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    {item.id === 'maintenance-monitoring' && urgentCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {urgentCount > 9 ? '9+' : urgentCount}
                      </span>
                    )}
                  </div>
                  <span className={item.id === 'maintenance-monitoring' && urgentCount > 0 ? 'text-red-600 font-semibold' : ''}>
                    {item.label || t(item.labelKey)}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>


      {/* Mobile Top Bar avec Menu Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 py-2">
        <h1 className="text-lg font-bold text-blue-600">SoplanElevage</h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
      </div>


      {/* Mobile Full Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <nav className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate?.(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      group flex items-center w-full px-3 py-3 text-sm font-medium rounded-md
                      transition-colors duration-200
                      ${isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="relative mr-3">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      {item.id === 'maintenance-monitoring' && urgentCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                          {urgentCount > 9 ? '9+' : urgentCount}
                        </span>
                      )}
                    </div>
                    <span className={item.id === 'maintenance-monitoring' && urgentCount > 0 ? 'text-red-600 font-semibold' : ''}>
                      {item.label || t(item.labelKey)}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
