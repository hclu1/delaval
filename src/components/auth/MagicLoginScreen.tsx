import React, { useState } from 'react';
import { api } from '../../lib/api';

interface MagicLoginScreenProps {
  token: string;
  onLoginSuccess: () => void;
}

export function MagicLoginScreen({ token, onLoginSuccess }: MagicLoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.auth.magicLogin({ token, password });
      // If success, remove the token from URL so it doesn't try to log in again on refresh
      window.history.replaceState({}, document.title, '/');
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Mot de passe incorrect ou lien expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Connexion Sécurisée
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Veuillez entrer le code à 6 chiffres reçu par l'administrateur
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Code de connexion (6 chiffres)
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="text"
                  autoComplete="off"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-lg text-center tracking-widest"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || password.length !== 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Vérification...' : 'Se connecter'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-blue-600 hover:text-blue-500">
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
