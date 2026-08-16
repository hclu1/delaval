import { Card } from '../common/Card';
import { Button } from '../common/Button';
import {MapPin, Calendar, Clock, Wrench, Edit, History} from 'lucide-react';
import { api } from '../../lib/api';


interface MachineCardProps {
  machine: any;
  onSelect?: () => void;
  onIntervention?: () => void;
  onEdit?: () => void;
  onHistory?: () => void;
  showClientInfo?: boolean;
}


export function MachineCard({ 
  machine, 
  onSelect, 
  onIntervention, 
  onEdit, 
  onHistory,
  showClientInfo 
}: MachineCardProps) {
  
  const relationColors: Record<string, string> = {
    MAITRE: 'bg-purple-100 text-purple-800',
    ESCLAVE: 'bg-blue-100 text-blue-800',
    PARENT: 'bg-green-100 text-green-800',
    ENFANT: 'bg-yellow-100 text-yellow-800',
  };

  const currentUser = api.auth.user;
  const canEditMachines = currentUser?.permissions?.includes('edit_machines') || false;


  return (
    <Card className="hover:shadow-lg transition-all">
      <div 
        onClick={onSelect} 
        className="cursor-pointer space-y-3"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
<h3 className="text-lg font-bold text-gray-900">{machine.nom}</h3>
{machine.machineType && (
  <p className="text-xs text-blue-600 font-medium">{machine.machineType}</p>
)}
<p className="text-sm text-gray-600">N° {machine.numeroSerie}</p>          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${relationColors[machine.typeRelation] || 'bg-gray-100 text-gray-800'}`}>
            {machine.typeRelation}
          </span>
        </div>


        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={16} />
            <span>Installée: {machine.dateInstallation ? new Date(machine.dateInstallation).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={16} />
            <span>Compteur: {machine.compteur}h</span>
          </div>
          {machine.dateDernierEntretien && (
            <div className="flex items-center gap-2 text-gray-600 col-span-2">
              <Wrench size={16} />
              <span>Dernier entretien: {new Date(machine.dateDernierEntretien).toLocaleDateString()}</span>
            </div>
          )}
        </div>


        {/* GPS Badge */}
        {machine.gpsLat && machine.gpsLng && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <MapPin size={16} />
            <span>Position GPS enregistrée</span>
          </div>
        )}
      </div>


      {/* Actions */}
      <div className="flex gap-2 pt-2 mt-3 border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            if (machine.gpsLat && machine.gpsLng) {
              window.open(`https://www.google.com/maps?q=${machine.gpsLat},${machine.gpsLng}`, '_blank');
            } else {
                alert('Pas de coordonnées GPS pour cette machine.');
            }
          }}
        >
          <MapPin size={16} />
          GPS
        </Button>
        
        {onHistory && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onHistory();
            }}
          >
            <History size={16} />
            Historique
          </Button>
        )}
        
        {canEditMachines && onEdit && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit size={16} />
            Modifier
          </Button>
        )}
        
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onIntervention?.();
          }}
        >
          <Wrench size={16} />
          Intervention
        </Button>
      </div>
    </Card>
  );
}
