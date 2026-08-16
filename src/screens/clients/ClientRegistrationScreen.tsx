// src/screens/clients/ClientRegistrationScreen.tsx
// Écran simple : le client crée son mot de passe pour accéder au portail
import React, { useState } from 'react';
import { api } from '../../lib/api';

interface ClientRegistrationScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}

export function ClientRegistrationScreen({ onNavigate }: ClientRegistrationScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!email.trim()) {
      setError('Veuillez saisir votre email.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      // Vérifier que l'email correspond bien à un client existant
      const clientResult = await api.entities.clients.list({
        filter: { email: email.toLowerCase().trim() },
        limit: 1
      });

      if (!clientResult.list || clientResult.list.length === 0) {
        setError('Aucun compte client trouvé pour cet email. Contactez votre administrateur.');
        setLoading(false);
        return;
      }

      // Tentative 1 : connexion directe (compte déjà créé mais non confirmé ou existant)
      try {
        await api.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });
        setSuccess(true);
        return;
      } catch (signInErr: any) {
        // Si la connexion échoue (mauvais mdp ou compte inexistant), on tente la création
        const signInMsg = signInErr?.message || '';
        if (signInMsg.includes('Invalid login') || signInMsg.includes('invalid_credentials') || signInMsg.includes('user not found') || signInMsg.includes('No user')) {
          // Compte inexistant → créer
        } else if (signInMsg.includes('expired') || signInMsg.includes('verification')) {
          // Code de vérification expiré → recréer le compte
        } else {
          // Autre erreur de connexion
          throw signInErr;
        }
      }

      // Tentative 2 : création du compte
      await api.auth.signUpWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      // Marquer hasAccount=true dans la table utilisateurs
      try {
        const userRecord = await api.entities.utilisateurs.list({
          filter: { email: email.toLowerCase().trim() },
          limit: 1
        });
        if (userRecord.list && userRecord.list.length > 0) {
          await api.entities.utilisateurs.update(userRecord.list[0]._id, {
            hasAccount: true,
            updatedAt: new Date().toISOString()
          });
        }
      } catch {
        // Non bloquant : la coche n'est pas critique
      }

      // Tentative 3 : connexion immédiate après création
      try {
        await api.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });
      } catch {
        // Lumi peut nécessiter une confirmation email — succès quand même
      }

      setSuccess(true);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already') || msg.includes('existe') || msg.includes('registered')) {
        setError('Un compte existe déjà. Vérifiez votre email de confirmation ou contactez l\'administrateur.');
      } else if (msg.includes('expired') || msg.includes('verification')) {
        setError('Code de vérification expiré. Contactez votre administrateur pour réinitialiser votre accès.');
      } else {
        setError(`Erreur : ${msg || 'Impossible de créer le compte.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Compte créé !</h2>
          <p className="text-gray-600 mb-6">
            Votre mot de passe a été enregistré. Vous pouvez maintenant vous connecter.
          </p>
          <button
            onClick={() => onNavigate('client-portal')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Accéder à mon espace client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Créer mon mot de passe</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Utilisez l'email associé à votre compte client SoplanÉlevage
          </p>
        </div>

        {/* Formulaire */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email client
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoComplete="new-password"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Créer mon mot de passe
              </>
            )}
          </button>

          <button
            onClick={() => onNavigate('client-portal')}
            className="w-full text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
          >
            ← Retour
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Votre email doit correspondre à celui enregistré par SoplanÉlevage.
          En cas de problème, contactez votre administrateur.
        </p>
      </div>
    </div>
  );
}