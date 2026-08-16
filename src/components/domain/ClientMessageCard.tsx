import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Mail, Clock, Check } from 'lucide-react';

interface ClientMessageCardProps {
  message: any;
  onMarkAsRead?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

export function ClientMessageCard({ 
  message, 
  onMarkAsRead,
  onDelete 
}: ClientMessageCardProps) {
  
  return (
    <Card className={`${!message.estLu ? 'border-l-4 border-l-red-500 bg-red-50' : 'bg-white'}`}>
      <div className="space-y-3">
        {/* En-tête */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Mail size={20} className={message.estLu ? 'text-gray-400' : 'text-red-500'} />
            <div>
              <p className="font-bold text-gray-900">{message.clientName}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={12} />
                {new Date(message.dateEnvoi).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
          
          {!message.estLu && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
              NOUVEAU
            </span>
          )}
        </div>

        {/* Message */}
        <div className="bg-gray-100 rounded-lg p-3">
          <p className="text-sm text-gray-800">{message.message}</p>
        </div>

        {/* Statut de lecture */}
        {message.estLu && message.dateLecture && (
          <div className="text-xs text-green-600 flex items-center gap-1">
            <Check size={14} />
            Lu le {new Date(message.dateLecture).toLocaleString('fr-FR')} par {message.technicienName}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {!message.estLu && onMarkAsRead && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => onMarkAsRead(message._id)}
            >
              <Check size={16} />
              Marquer comme lu
            </Button>
          )}
          
          {onDelete && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1"
              onClick={() => onDelete(message._id)}
            >
              Supprimer
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
