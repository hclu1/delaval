import React, { useEffect, useState } from 'react';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { ClientMessageCard } from '../../components/domain/ClientMessageCard';
import { ClientMessageModal } from '../../components/domain/ClientMessageModal';
import { useClientMessages } from '../../hooks/useClientMessages';
import type { ClientMessage } from '../../hooks/useClientMessages';

interface ClientMessagesScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  clientId?: string;
}

export function ClientMessagesScreen({ onNavigate, clientId }: ClientMessagesScreenProps) {
  const { messages, loading, fetchMessages, createMessage, markAsRead } = useClientMessages();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ClientMessage | null>(null);
  const [modalMode, setModalMode] = useState<'read' | 'write'>('write');

  useEffect(() => {
    fetchMessages(clientId);
  }, [clientId]);

  const filteredMessages = messages.filter(msg =>
    msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.sentBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = messages.filter(msg => !msg.isRead).length;

  const handleSendMessage = async (messageText: string) => {
    if (!clientId) return;
    
    await createMessage({
      clientId,
      message: messageText,
      sentBy: 'current-user', // TODO: Récupérer l'utilisateur actuel
      creator: 'current-user'
    });
    
    await fetchMessages(clientId);
  };

  const handleMarkAsRead = async (messageId: string) => {
    await markAsRead(messageId);
    await fetchMessages(clientId);
  };

  const handleOpenMessage = (message: ClientMessage) => {
    setSelectedMessage(message);
    setModalMode('read');
    setIsModalOpen(true);
    
    if (!message.isRead) {
      handleMarkAsRead(message._id);
    }
  };

  const handleNewMessage = () => {
    setSelectedMessage(null);
    setModalMode('write');
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
          {unreadCount > 0 && (
            <span className="text-sm text-blue-600 font-medium">
              {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Button onClick={handleNewMessage}>
          Nouveau message
        </Button>
      </div>

      <div className="mb-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un message..."
        />
      </div>

      {loading && messages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Chargement des messages...
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? 'Aucun message trouvé' : 'Aucun message'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((message) => (
            <ClientMessageCard
              key={message._id}
              message={message}
              onMarkAsRead={handleMarkAsRead}
              onClick={() => handleOpenMessage(message)}
            />
          ))}
        </div>
      )}

      <ClientMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSend={modalMode === 'write' ? handleSendMessage : undefined}
        message={selectedMessage || undefined}
        clientId={clientId}
        mode={modalMode}
      />
    </div>
  );
}
