// InterventionHistoryCard.tsx
import React from 'react';
import { Card } from '../common/Card';
import { ChevronRight, Clock, User, MapPin } from 'lucide-react';


interface InterventionHistoryCardProps {
  intervention: any;
  onNavigate: (screen: string, params?: any) => void;
  showClient?: boolean;
  showMachine?: boolean;
  clientView?: boolean;
  clientId?: string;
}


export function InterventionHistoryCard({ 
  intervention, 
  onNavigate,
  showClient = false,
  showMachine = true,
  clientView = false,
  clientId
}: InterventionHistoryCardProps) {
  
  const getStatusStyle = (statut: string) => {
    const styles: Record<string, { icon: string; color: string; bg: string; label: string }> = {
      'PLANIFIEE': { icon: '📅', color: 'text-blue-700', bg: 'bg-blue-100', label: 'Planifiée' },
      'EN_COURS':  { icon: '⚙️', color: 'text-orange-700', bg: 'bg-orange-100', label: 'En cours' },
      'TERMINEE':  { icon: '✅', color: 'text-green-700', bg: 'bg-green-100', label: 'Terminée' },
      'ANNULEE':   { icon: '❌', color: 'text-red-700', bg: 'bg-red-100', label: 'Annulée' }
    };
    return styles[statut] || styles['PLANIFIEE'];
  };


  const getTypeInfo = (type: string) => {
    const types: Record<string, { label: string; icon: string; color: string }> = {
      'REPAIR':        { label: 'Dépannage',         icon: '🔧', color: 'text-red-600' },
      'MAINTENANCE':   { label: 'Entretien',          icon: '⚙️', color: 'text-blue-600' },
      'Entretien':     { label: 'Entretien',          icon: '⚙️', color: 'text-blue-600' },
      'INSTALLATION':  { label: 'Installation',       icon: '🔨', color: 'text-purple-600' },
      'COMMISSIONING': { label: 'Mise en service VMS',icon: '🚀', color: 'text-green-600' }
    };
    return types[type] || { label: type, icon: '⚙️', color: 'text-gray-600' };
  };


  const statusStyle = getStatusStyle(intervention.statut);
  const typeInfo = getTypeInfo(intervention.type);
  const isClickable = intervention.statut !== 'ANNULEE';


  const handleClick = () => {
    if (clientView) {
      const isFinished = intervention.statut === 'TERMINEE';
      if (isFinished) {
        import('../../services/clientPdfService').then(({ downloadInterventionPDF }) => {
          downloadInterventionPDF(intervention._id).catch((error: any) => {
            console.error('[CLIENT] Erreur téléchargement PDF:', error);
            alert(`❌ Erreur lors de la génération du PDF\n\n${error.message || 'Erreur inconnue'}`);
          });
        });
      } else {
        alert("ℹ️ Le rapport PDF sera disponible une fois l'intervention terminée.");
      }
      return;
    }

    console.log('==========================================');
    console.log('🖱️ [CARD] CLICK sur intervention');
    console.log('🖱️ [CARD] ID:', intervention._id);
    console.log('🖱️ [CARD] Type:', intervention.type);
    console.log('🖱️ [CARD] Statut:', intervention.statut);
    console.log('==========================================');

    if (!isClickable) {
      alert('❌ Cette intervention a été annulée.');
      return;
    }

    const isFinished = intervention.statut === 'TERMINEE';
    console.log('🖱️ [CARD] isFinished:', isFinished);
    console.log('➡️ [CARD] Type détecté:', intervention.type);
    
    switch (intervention.type) {
      case 'REPAIR':
        console.log('✅ [CARD] Navigation vers: intervention-form (REPAIR)');
        onNavigate('intervention-form', { 
          interventionId: intervention._id,
          clientId: intervention.clientId,
          machineId: intervention.machineIds?.[0],
          readOnly: isFinished
        });
        break;
      
 case 'MAINTENANCE':
case 'Entretien': {
  // Avertir si le montage est en cours par un autre technicien
  const currentUserId = lumi.auth.user?.userId;
  const isOtherTechnicien =
    intervention.statut === 'EN_COURS' &&
    intervention.technicienId &&
    intervention.technicienId !== currentUserId;

  if (isOtherTechnicien) {
    const techNom = intervention.technicienNom || 'un autre technicien';
    const confirmed = window.confirm(
      `⚠️ Ce montage est en cours par ${techNom}.\n\nVoulez-vous le rejoindre et travailler dessus ensemble ?`
    );
    if (!confirmed) return;
  }

  const machineKitSelections = (intervention.kits || []).map((kit: any) => ({
    machineId: kit.machineId,
    kitId: kit.kitId
  }));

  const savedSectionsState = (intervention.selectedSections || []).map((s: any) => ({
    machineId: s.machineId,
    sectionName: s.sectionName,
    tasks: s.tasks || []
  }));

  onNavigate('multi-machine-section-selection', {
    clientId: intervention.clientId,
    machineKitSelections: machineKitSelections,
    resumeInterventionId: intervention._id,
    savedSectionsState: savedSectionsState
  });
  break;
}

      case 'COMMISSIONING':
        console.log('✅ [CARD] Navigation vers: commissioning-protocol');
        onNavigate('commissioning-protocol', { 
          interventionId: intervention._id,
          clientId: intervention.clientId,
          machineIds: intervention.machineIds || [],
          readOnly: isFinished
        });
        break;

      case 'INSTALLATION':
        console.log('✅ [CARD] Navigation vers: intervention-form (INSTALLATION)');
        onNavigate('intervention-form', { 
          interventionId: intervention._id,
          clientId: intervention.clientId,
          machineId: intervention.machineIds?.[0],
          readOnly: isFinished
        });
        break;

      default:
        console.log('⚠️ [CARD] Type inconnu, navigation par défaut vers: intervention-form');
        onNavigate('intervention-form', { 
          interventionId: intervention._id,
          clientId: intervention.clientId,
          readOnly: isFinished
        });
        break;
    }
    
    console.log('==========================================');
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const getDuration = () => {
    if (intervention.duree) {
      const hours = Math.floor(intervention.duree / 60);
      const minutes = intervention.duree % 60;
      return `${hours}h${minutes.toString().padStart(2, '0')}`;
    }
    return null;
  };


  const duration = getDuration();


  return (
    <Card 
      className={`
        transition-all duration-200 
        ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-blue-400' : 'opacity-60 cursor-not-allowed'}
        ${intervention.statut === 'EN_COURS' ? 'border-l-4 border-l-orange-500' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-2xl ${typeInfo.color}`}>{typeInfo.icon}</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{typeInfo.label}</h3>
              <p className="text-sm text-gray-500">N° {intervention.numeroIntervention || 'N/A'}</p>
            </div>
            <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.color}`}>
              {statusStyle.icon} {statusStyle.label}
            </div>
          </div>

          {showClient && intervention.clientNom && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User size={16} />
              <span className="font-medium">{intervention.clientNom}</span>
            </div>
          )}

          {showMachine && intervention.machineNom && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={16} />
              <span>{intervention.machineNom}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{formatDate(intervention.dateDebut)}</span>
            </div>
            {duration && intervention.statut === 'TERMINEE' && (
              <div className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                ⏱️ {duration}
              </div>
            )}
          </div>

          {intervention.type === 'REPAIR' && intervention.protocolData?.diagnostic && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 line-clamp-2">
              {intervention.protocolData.diagnostic}
            </div>
          )}

          {intervention.statut === 'EN_COURS' && (intervention.type === 'MAINTENANCE' || intervention.type === 'COMMISSIONING') && (
            <div className="mt-2">
              {intervention.type === 'COMMISSIONING' && intervention.protocolData?.progress && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-green-500 h-full transition-all"
                      style={{ 
                        width: `${(intervention.protocolData.progress.completed / intervention.protocolData.progress.total) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">
                    {intervention.protocolData.progress.completed}/{intervention.protocolData.progress.total}
                  </span>
                </div>
              )}
              {intervention.type === 'MAINTENANCE' && intervention.progressionGlobale !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all"
                      style={{ width: `${intervention.progressionGlobale}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">
                    {Math.round(intervention.progressionGlobale)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {isClickable && (
          <ChevronRight 
            size={24} 
            className={`
              flex-shrink-0 transition-transform
              ${intervention.statut === 'EN_COURS' ? 'text-orange-600' : 'text-gray-400'}
            `}
          />
        )}
      </div>

      {intervention.statut === 'EN_COURS' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-orange-600 text-sm font-medium">
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
            Cliquez pour reprendre cette intervention
          </div>
        </div>
      )}

      {intervention.statut === 'TERMINEE' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            {clientView ? (
              <span className="text-blue-600 font-medium">📄 Cliquez pour telecharger le rapport PDF</span>
            ) : (
              <span className="text-gray-500">👁️ Cliquez pour consulter (lecture seule)</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}