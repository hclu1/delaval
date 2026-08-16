import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { TextArea } from '../../components/common/TextArea';
import {Save, ArrowLeft, AlertCircle} from 'lucide-react';
import { api } from '../../lib/api';
import { useClients } from '../../hooks/useClients';

interface ClientFormScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  clientId?: string;
  returnTo?: string;
  returnParams?: any;
}

export function ClientFormScreen({ onNavigate, clientId, returnTo = 'clients', returnParams = {} }: ClientFormScreenProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    nomFerme: '',
    numeroClient: '',
    adresse: '',
    codePostal: '',
    ville: '',
    telephone: '',
    email: '',
    notes: ''
  });

  const { clients } = useClients();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  // Détection de doublons en temps réel
  useEffect(() => {
    if (clientId) return; // Ne pas chercher de doublons si on modifie déjà un client

    const queryNom = formData.nom.trim().toLowerCase();
    const queryFerme = formData.nomFerme.trim().toLowerCase();

    if (queryNom.length > 2 || queryFerme.length > 2) {
      const matches = clients.filter(c => {
        const matchNom = queryNom && c.nom?.toLowerCase().includes(queryNom);
        const matchFerme = queryFerme && c.nomFerme?.toLowerCase().includes(queryFerme);
        return matchNom || matchFerme;
      }).slice(0, 5);
      
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [formData.nom, formData.nomFerme, clients, clientId]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const { list } = await api.entities.clients.list({
        filter: { _id: clientId }
      });
      
      if (list && list.length > 0) {
        const client = list[0];
        setFormData({
          nom: client.nom || '',
          prenom: client.prenom || '',
          nomFerme: client.nomFerme || '',
          numeroClient: client.numeroClient || '',
          adresse: client.adresse || '',
          codePostal: client.codePostal || '',
          ville: client.ville || '',
          telephone: client.telephone || '',
          email: client.email || '',
          notes: client.notes || ''
        });
      } else {
        throw new Error('Client non trouvé');
      }
    } catch (error) {
      console.error('❌ Erreur chargement client:', error);
      alert('Erreur lors du chargement du client');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const clientData = {
        ...formData,
        actif: true,
        updatedAt: new Date().toISOString(),
        ...(clientId ? {} : { creator: 'system', createdAt: new Date().toISOString() })
      };

      if (clientId) {
        await api.entities.clients.update(clientId, clientData);
      } else {
        await api.entities.clients.create(clientData);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      onNavigate(returnTo, returnParams);
    } catch (error) {
      console.error('❌ Erreur enregistrement client:', error);
      alert('Erreur: ' + (error instanceof Error ? error.message : JSON.stringify(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (client: any) => {
    if (window.confirm(`Le client "${client.nom}" (Ferme: ${client.nomFerme || '-'}) existe déjà.\n\nVoulez-vous ouvrir sa fiche pour la modifier plutôt que de créer un doublon ?`)) {
      onNavigate('client-form', { clientId: client._id, returnTo, returnParams });
    }
  };

  return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(returnTo, returnParams)}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Retour
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {clientId ? 'Modifier le client' : 'Nouveau client'}
          </h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Informations personnelles</h2>
              
              {showSuggestions && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 font-semibold mb-3">
                    <AlertCircle size={20} />
                    <span>Des clients similaires existent déjà :</span>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map(client => (
                      <div 
                        key={client._id} 
                        onClick={() => handleSelectSuggestion(client)}
                        className="flex items-center justify-between bg-white p-3 rounded border hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{client.nom} {client.prenom}</p>
                          <p className="text-sm text-gray-600">Ferme : {client.nomFerme || '-'}</p>
                        </div>
                        <Button type="button" size="sm" variant="secondary">
                          Éditer
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-3">
                    Sélectionnez un client ci-dessus pour éviter de créer un doublon.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nom"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                />
                <Input
                  label="Prénom"
                  value={formData.prenom}
                  onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                />
                <Input
                  label="Nom de la ferme"
                  value={formData.nomFerme}
                  onChange={(e) => setFormData(prev => ({ ...prev, nomFerme: e.target.value }))}
                />
                <Input
                  label="Numéro client"
                  value={formData.numeroClient}
                  onChange={(e) => setFormData(prev => ({ ...prev, numeroClient: e.target.value }))}
                  placeholder="Ex: CLI001"
                />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Adresse</h2>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Code postal"
                    value={formData.codePostal}
                    onChange={(e) => setFormData(prev => ({ ...prev, codePostal: e.target.value }))}
                  />
                  <Input
                    label="Ville"
                    value={formData.ville}
                    onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Téléphone"
                  type="text"
                  value={formData.telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <TextArea
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                placeholder="Informations complémentaires..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onNavigate('clients')}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save size={20} />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
  );
}