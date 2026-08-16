import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

type UserType = 'client' | 'technicien';

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [userType, setUserType] = useState<UserType>('client');
  const [clientName, setClientName] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Client Login Submit
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.auth.signIn({ clientName, clientNumber });
      onLoginSuccess();
    } catch (err: any) {
      console.error('Erreur authentification:', err);
      setError(err?.message || 'Nom ou numéro de client incorrect.');
    } finally {
      setLoading(false);
    }
  };

  // Google Login Success
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    setLoading(true);
    try {
      await api.auth.signInWithGoogle({ token: credentialResponse.credential });
      onLoginSuccess();
    } catch (err: any) {
      console.error('Erreur authentification Google:', err);
      setError(err?.message || 'Erreur lors de la connexion Google');
    } finally {
      setLoading(false);
    }
  };

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'VOTRE_CLIENT_ID_GOOGLE_ICI';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SoplanElevage
          </h1>
          <p className="text-gray-600">
            Application de maintenance professionnelle
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => { setUserType('client'); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              userType === 'client' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Espace Client
          </button>
          <button
            onClick={() => { setUserType('technicien'); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              userType === 'technicien' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Espace Technicien
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {userType === 'client' ? (
          <form onSubmit={handleClientSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la ferme / client
              </label>
              <Input
                type="text"
                placeholder="Ex: Ferme Test"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro Client
              </label>
              <Input
                type="text"
                placeholder="Ex: 12345"
                value={clientNumber}
                onChange={(e) => setClientNumber(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-4"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Connexion sécurisée pour les techniciens Soplan.
            </p>
            {loading && <p className="text-sm text-blue-500">Connexion en cours...</p>}
            
            <div className="flex justify-center">
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Erreur de connexion à Google')}
                  useOneTap
                  theme="filled_blue"
                  shape="rectangular"
                  width="300"
                />
              </GoogleOAuthProvider>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}