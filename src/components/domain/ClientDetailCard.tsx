//ClientDetailCard.tsx
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { MapPin, Phone, Wrench, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useClientMessages } from '../../hooks/useClientMessages';

interface ClientDetailCardProps {
  client: any;
  machinesCount: number;
  onViewDetails: () => void;
  onViewMachines?: () => void;
  onCreateIntervention?: () => void;
}

export function ClientDetailCard({ 
  client, 
  machinesCount, 
  onViewDetails, 
  onViewMachines, 
  onCreateIntervention 
}: ClientDetailCardProps) {
  const { countUnreadMessages } = useClientMessages();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnreadCount = async () => {
      const count = await countUnreadMessages(client._id);
      setUnreadCount(count);
    };
    loadUnreadCount();
  }, [client._id]);

  return (
    <Card className="hover:shadow-lg transition-all relative">
      {/* Badge rouge pour messages non lus */}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg animate-pulse">
            {unreadCount}
          </div>
        </div>
      )}

      {/* Zone cliquable pour voir les détails */}
      <div 
        onClick={onViewDetails} 
        className="cursor-pointer space-y-3"
      >
        {/* En-tête du client */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center relative">
            <span className="text-white font-bold text-xl">
              {client.nom?.charAt(0) || '?'}
            </span>
            {/* Petit badge mail si messages non lus */}
            {unreadCount > 0 && (
              <Mail size={16} className="absolute -bottom-1 -right-1 text-red-500 bg-white rounded-full p-0.5" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg">{client.nom}</h3>
            <p className="text-sm text-gray-600">{client.nomFerme || 'Ferme non renseignée'}</p>
          </div>
        </div>

        {/* Informations du client */}
        <div className="space-y-1">
          {client.adresse && (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <MapPin size={14} />
              {client.adresse}{client.ville ? ` — ${client.ville}` : ''}
            </p>
          )}
          {client.telephone && (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Phone size={14} />
              {client.telephone}
            </p>
          )}
          <p className="text-sm font-semibold text-blue-600 flex items-center gap-2">
            <Wrench size={14} />
            {machinesCount} machine{machinesCount > 1 ? 's' : ''}
          </p>
          {/* Indicateur de messages */}
          {unreadCount > 0 && (
            <p className="text-sm font-bold text-red-600 flex items-center gap-2">
              <Mail size={14} />
              {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Boutons d'action - EN DEHORS de la zone cliquable */}
      <div className="flex gap-2 pt-3 mt-3 border-t">
        {onViewMachines && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewMachines();
            }}
          >
            Machines
          </Button>
        )}
        
        {onCreateIntervention && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onCreateIntervention();
            }}
          >
            Intervention
          </Button>
        )}
      </div>
    </Card>
  );
}