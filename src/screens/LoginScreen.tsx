// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [clientName, setClientName] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.auth.signIn({ clientName, clientNumber });
      onLoginSuccess(); 
    } catch (err: any) {
      console.error('Erreur de connexion:', err);
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
            Connexion Soplan Élevage
          </h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
                Nom du Client
              </label>
              <Input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="clientNumber" className="block text-sm font-medium text-gray-700">
                Numéro Client
              </label>
              <Input
                id="clientNumber"
                type="text"
                value={clientNumber}
                onChange={(e) => setClientNumber(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}