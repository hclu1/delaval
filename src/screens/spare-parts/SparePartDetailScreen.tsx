//SparePartDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {ArrowLeft, Edit, Trash2, Package, AlertCircle, TrendingUp} from 'lucide-react';
import { useSpareParts } from '../../hooks/useSpareParts';
import { api } from '../../lib/api';
import { useVisibilityRefresh } from '../../hooks/useVisibilityRefresh';

interface SparePartDetailScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  partId: string;
}

export function SparePartDetailScreen({ onNavigate, partId }: SparePartDetailScreenProps) {
  const { spareParts, fetchSpareParts, deleteSparePart } = useSpareParts();
  const [part, setPart] = useState<any>(null);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [partId]);

  // Rafraîchissement automatique au retour sur l'app (smartphone)
  useVisibilityRefresh(loadData);

  const loadData = async () => {
    await fetchSpareParts({ limit: 100 });
    await loadUsageHistory();
  };

  const loadUsageHistory = async () => {
    try {
      const result = await api.entities.intervention_parts.list({
        where: { partId }
      });
      setUsageHistory(result.list);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  useEffect(() => {
    if (spareParts.length > 0) {
      const found = spareParts.find(p => p._id === partId);
      setPart(found);
    }
  }, [spareParts, partId]);

  const handleDelete = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette pièce ?')) {
      try {
        await deleteSparePart(partId);
        alert('Pièce supprimée');
        onNavigate('spare-parts');
      } catch (error) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  if (!part) {
    return (
        <Card className="text-center py-12">
          <p className="text-gray-500">Chargement de la pièce...</p>
        </Card>
    );
  }

  const getStockStatus = () => {
    if (part.stock === 0) return { color: 'text-red-600', bg: 'bg-red-100', label: 'Rupture de stock' };
    if (part.stock <= part.stockMin) return { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Stock faible' };
    return { color: 'text-green-600', bg: 'bg-green-100', label: 'Stock correct' };
  };

  const stockStatus = getStockStatus();
  const totalUsed = usageHistory.reduce((sum, h) => sum + (h.quantite || 0), 0);

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button 
              variant="ghost" 
              onClick={() => onNavigate('spare-parts')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{part.designation}</h1>
              <p className="text-gray-600 mt-1">Réf: {part.reference}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => onNavigate('spare-part-form', { sparePartId: partId })}
              className="flex items-center gap-2"
            >
              <Edit size={18} />
              Modifier
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 size={18} />
              Supprimer
            </Button>
          </div>
        </div>

        {/* Stock Alert */}
        {(part.stock === 0 || part.stock <= part.stockMin) && (
          <Card className={`${stockStatus.bg} border-2 border-${stockStatus.color.replace('text-', '')}`}>
            <div className="flex items-center gap-3">
              <AlertCircle className={stockStatus.color} size={24} />
              <div>
                <h3 className={`font-bold ${stockStatus.color}`}>{stockStatus.label}</h3>
                <p className="text-sm text-gray-700">
                  {part.stock === 0 
                    ? 'Cette pièce est en rupture de stock. Commandez rapidement.' 
                    : `Le stock est en dessous du minimum (${part.stockMin}). Commande recommandée.`}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <Package className="text-blue-600" size={24} />
              <h2 className="text-lg font-bold text-gray-900">Stock actuel</h2>
            </div>
            <div className="text-4xl font-bold text-blue-600">{part.stock}</div>
            <div className="text-sm text-gray-600 mt-2">
              Minimum: {part.stockMin} | Maximum: {part.stockMax}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="text-green-600" size={24} />
              <h2 className="text-lg font-bold text-gray-900">Total utilisé</h2>
            </div>
            <div className="text-4xl font-bold text-green-600">{totalUsed}</div>
            <div className="text-sm text-gray-600 mt-2">
              Sur {usageHistory.length} intervention(s)
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Prix</h2>
            <div className="text-4xl font-bold text-gray-900">{part.prixUnitaire}€</div>
            <div className="text-sm text-gray-600 mt-2">Prix unitaire HT</div>
          </Card>
        </div>

        {/* Détails */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Informations détaillées</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Référence</h3>
              <p className="text-gray-900">{part.reference}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Catégorie</h3>
              <p className="text-gray-900">{part.categorie || 'Non spécifiée'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Fournisseur</h3>
              <p className="text-gray-900">{part.fournisseur || 'Non spécifié'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Emplacement</h3>
              <p className="text-gray-900">{part.emplacement || 'Non spécifié'}</p>
            </div>
          </div>
          {part.description && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{part.description}</p>
            </div>
          )}
        </Card>

        {/* Historique d'utilisation */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Historique d'utilisation</h2>
          {usageHistory.length === 0 ? (
            <p className="text-gray-500 italic">Aucune utilisation enregistrée</p>
          ) : (
            <div className="space-y-3">
              {usageHistory.map((usage: any, index: number) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => onNavigate('intervention-detail', { interventionId: usage.interventionId })}
                >
                  <div>
                    <div className="font-medium">Intervention #{usage.interventionId.slice(-6)}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(usage.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">Qté: {usage.quantite}</div>
                    <div className="text-sm text-gray-600">{(usage.quantite * part.prixUnitaire).toFixed(2)}€</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
  );
}