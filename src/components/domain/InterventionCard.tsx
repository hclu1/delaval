//InterventionCard.tsx
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import {Calendar, MapPin, User, Wrench, Package, AlertTriangle, Edit, Trash2, CheckCircle} from 'lucide-react';

interface InterventionCardProps {
  intervention: any; // L'objet intervention complet
  onSelect?: (interventionId: string) => void;
  onEdit?: (interventionId: string) => void;
  onDelete?: (interventionId: string) => void;
  onUpdateStatus?: (interventionId: string, newStatus: string) => void;
}

export function InterventionCard({ intervention, onSelect, onEdit, onDelete, onUpdateStatus }: InterventionCardProps) {
  // Fonction utilitaire pour formater la date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect?.(intervention._id)}>
      <div className="p-4">
        {/* En-tête : Type, Statut, Numéro */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                intervention.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' :
                intervention.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-700' :
                intervention.statut === 'PLANIFIEE' ? 'bg-gray-100 text-gray-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {intervention.statut}
              </span>
              <span className="text-sm text-gray-600">{intervention.type}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">N° {intervention.numeroIntervention}</h3>
          </div>
          <div className="flex gap-1">
            {onUpdateStatus && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(intervention._id, intervention.statut === 'TERMINEE' ? 'PLANIFIEE' : 'TERMINEE');
                }}
              >
                <CheckCircle size={16} />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(intervention._id);
                }}
              >
                <Edit size={16} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(intervention._id);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Date et Durée */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Calendar size={16} />
          <span>Début: {formatDate(intervention.dateDebut)}</span>
          {intervention.duree && <span>(Durée: {intervention.duree} min)</span>}
        </div>

        {/* Client et Machine */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User size={16} />
            <span className="font-medium">{intervention.clientNom}</span>
            {intervention.clientAdresse && <span className="text-gray-600">- {intervention.clientAdresse}</span>}
          </div>
          {intervention.machineNames && intervention.machineNames.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Wrench size={16} />
              <span>{intervention.machineNames.join(', ')}</span>
            </div>
          )}
        </div>

        {/* >>> NOUVELLE SECTION : Constatations / Diagnostics <<< */}
        {Array.isArray(intervention.diagnostics) && intervention.diagnostics.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-2">
              <AlertTriangle size={16} />
              Constatations ({intervention.diagnostics.length})
            </div>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {intervention.diagnostics.map((diag: any) => (
                <li key={diag.id} className={diag.resolu ? 'line-through text-gray-500' : ''}>
                  {diag.constatation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* >>> NOUVELLE SECTION : Pièces détachées utilisées <<< */}
        {Array.isArray(intervention.piecesUtilisees) && intervention.piecesUtilisees.length > 0 && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-bold text-orange-800 mb-2">
              <Package size={16} />
              Pièces utilisées ({intervention.piecesUtilisees.length})
            </div>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {intervention.piecesUtilisees.map((part: any) => (
                <li key={part.partId}>
                  {part.designation || part.reference} (Qté: {part.quantity})
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* >>> NOUVELLE SECTION : Actions réalisées <<< */}
        {intervention.actionsRealisees && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm font-bold text-gray-800 mb-2">Actions réalisées</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{intervention.actionsRealisees}</p>
          </div>
        )}
      </div>
    </Card>
  );
}