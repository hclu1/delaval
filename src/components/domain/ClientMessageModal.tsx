//ClientMessageModal.tsx
import React, { useState } from 'react';
import { Button } from '../common/Button';
import { TextArea } from '../common/TextArea';
import {Mail, Send, X, MessageSquare} from 'lucide-react';

interface ClientMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  onSendMessage?: (message: string) => Promise<void>;
  // Messages reçus du client
  messages?: any[];
  onMarkAsRead?: (messageId: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
}

export function ClientMessageModal({ 
  isOpen, 
  onClose, 
  clientId,
  clientName,
  onSendMessage,
  messages = [],
  onMarkAsRead,
  onDeleteMessage
}: ClientMessageModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'send'>('received'); // Onglet par défaut: messages reçus

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!message.trim() || !onSendMessage) return;
    
    setSending(true);
    try {
      await onSendMessage(message);
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = messages.filter(m => !m.estLu).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={24} className="text-blue-600" />
            Messages - {clientName}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* Onglets */}
        <div className="flex border-b">
          <button
            className={`flex-1 px-4 py-3 font-semibold transition-colors relative ${
              activeTab === 'received'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('received')}
          >
            Messages reçus ({messages.length})
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            className={`flex-1 px-4 py-3 font-semibold transition-colors ${
              activeTab === 'send'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('send')}
          >
            Envoyer un message
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6">
          {activeTab === 'received' ? (
            // Onglet Messages reçus
            <div className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun message reçu</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`border rounded-lg p-4 ${
                      !msg.estLu ? 'border-red-500 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {!msg.estLu && (
                            <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                              NOUVEAU
                            </span>
                          )}
                          <span className="font-semibold text-gray-900">
                            {msg.clientName}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatDate(msg.dateEnvoi)}
                        </p>
                        {msg.estLu && msg.dateLecture && (
                          <p className="text-xs text-green-600">
                            ✅ Lu le {formatDate(msg.dateLecture)}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {!msg.estLu && onMarkAsRead && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onMarkAsRead(msg._id)}
                          >
                            ✓ Lu
                          </Button>
                        )}
                        {onDeleteMessage && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              if (confirm('Supprimer ce message ?')) {
                                onDeleteMessage(msg._id);
                              }
                            }}
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-800 whitespace-pre-wrap mt-3">
                      {msg.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Onglet Envoyer un message
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre message
                </label>
                <TextArea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tapez votre message ici..."
                  rows={8}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Le client sera notifié de votre message
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Fermer
          </Button>
          
          {activeTab === 'send' && (
            <Button
              className="flex-1 flex items-center justify-center gap-2"
              onClick={handleSend}
              disabled={!message.trim() || sending}
            >
              <Send size={18} />
              {sending ? 'Envoi...' : 'Envoyer'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
