//CloseInterventionModal.tsx
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import {X, Save} from 'lucide-react';


interface CloseInterventionModalProps {
  isVisible: boolean;
  intervention: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}


export function CloseInterventionModal({ isVisible, intervention, onClose, onSave }: CloseInterventionModalProps) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    constatations: intervention?.constatations || '',
    diagnostic: intervention?.diagnostic || '',
    actionsRealisees: intervention?.actionsRealisees || '',
    travauxEffectues: intervention?.travauxEffectues || '',
    piecesUtilisees: intervention?.piecesUtilisees || '',
    observations: intervention?.observations || '',
    resolu: intervention?.resolu !== undefined ? intervention.resolu : true,
    recommandations: intervention?.recommandations || '',
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la clôture');
    } finally {
      setLoading(false);
    }
  };


  if (!isVisible) return null;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Clôturer l'intervention #{intervention?.numeroIntervention}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>


          <div className="space-y-4">
            {/* ✅ CONSTATATIONS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Constatations <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.constatations}
                onChange={(e) => setFormData(prev => ({ ...prev, constatations: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Que constatez-vous en arrivant sur place ?"
                required
              />
            </div>

            {/* ✅ DIAGNOSTIC */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnostic <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.diagnostic}
                onChange={(e) => setFormData(prev => ({ ...prev, diagnostic: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Quel est le problème identifié ?"
                required
              />
            </div>

            {/* ✅ ACTIONS RÉALISÉES */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actions réalisées <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.actionsRealisees}
                onChange={(e) => setFormData(prev => ({ ...prev, actionsRealisees: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Quelles actions avez-vous effectuées ?"
                required
              />
            </div>

            {/* ✅ TRAVAUX EFFECTUÉS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Travaux effectués <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.travauxEffectues}
                onChange={(e) => setFormData(prev => ({ ...prev, travauxEffectues: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Détails des travaux réalisés (démontage, remplacement, réglages...)"
                required
              />
            </div>

            {/* ✅ PIÈCES UTILISÉES */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pièces utilisées
              </label>
              <textarea
                value={formData.piecesUtilisees}
                onChange={(e) => setFormData(prev => ({ ...prev, piecesUtilisees: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Liste des pièces remplacées (ex: Filtre à huile, Joint de culasse...)"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Les pièces du stock seront ajoutées séparément dans la section dédiée
              </p>
            </div>

            {/* ✅ RÉSOLU OUI/NON */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Problème résolu ? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="resolu"
                    checked={formData.resolu === true}
                    onChange={() => setFormData(prev => ({ ...prev, resolu: true }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">✅ Oui, résolu</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="resolu"
                    checked={formData.resolu === false}
                    onChange={() => setFormData(prev => ({ ...prev, resolu: false }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">❌ Non, problème persistant</span>
                </label>
              </div>
            </div>

            {/* ✅ RECOMMANDATIONS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recommandations
              </label>
              <textarea
                value={formData.recommandations}
                onChange={(e) => setFormData(prev => ({ ...prev, recommandations: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Recommandations pour le client (maintenance préventive, surveillance...)"
              />
            </div>

            {/* ✅ OBSERVATIONS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observations générales
              </label>
              <textarea
                value={formData.observations}
                onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Autres remarques..."
              />
            </div>
          </div>


          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex items-center gap-2">
              <Save size={20} />
              {loading ? 'Enregistrement...' : 'Clôturer l\'intervention'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
