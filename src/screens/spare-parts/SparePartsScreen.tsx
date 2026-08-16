//SparePartsScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import {Plus, Package, AlertTriangle, Edit2, QrCode} from 'lucide-react';
import { useSpareParts } from '../../hooks/useSpareParts';
import { useVisibilityRefresh } from '../../hooks/useVisibilityRefresh';

interface SparePartsScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}

export function SparePartsScreen({ onNavigate }: SparePartsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const { spareParts, loading, fetchSpareParts } = useSpareParts();

// Chargement initial
useEffect(() => {
  fetchSpareParts({ filter: {}, limit: 100 });
}, []);

// Recherche serveur avec debounce 400ms
useEffect(() => {
  const timer = setTimeout(() => {
    if (searchQuery.trim() === '') {
      fetchSpareParts({ filter: {}, limit: 100 });
    } else {
      fetchSpareParts({
        filter: {
          $or: [
            { reference: { $regex: searchQuery, $options: 'i' } },
            { designation: { $regex: searchQuery, $options: 'i' } }
          ]
        },
        limit: 200
      });
    }
  }, 400);
  return () => clearTimeout(timer);
}, [searchQuery]);

useVisibilityRefresh(() => fetchSpareParts({ filter: {}, limit: 100 }));

const filteredParts = spareParts.filter((part) => {
  let matchesFilter = true;
  if (filter === 'LOW_STOCK') {
    matchesFilter = part.stock > 0 && part.stock <= part.seuilAlerte;
  } else if (filter === 'OUT_OF_STOCK') {
    matchesFilter = part.stock === 0;
  }
  return matchesFilter;
});

  const getStockStatus = (stock: number, seuil: number) => {
    if (stock === 0) return { color: 'text-red-600', bg: 'bg-red-50', label: 'Rupture' };
    if (stock <= seuil) return { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Stock faible' };
    return { color: 'text-green-600', bg: 'bg-green-50', label: 'En stock' };
  };

  const totalValue = filteredParts.reduce((sum, part) => sum + (part.stock * part.prixUnitaire), 0);
  const lowStockCount = spareParts.filter(p => p.stock > 0 && p.stock <= p.seuilAlerte).length;
  const outOfStockCount = spareParts.filter(p => p.stock === 0).length;

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pièces détachées</h1>
            <p className="text-gray-600 mt-1">Gestion du stock et des références</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => onNavigate('spare-part-form')}>
            <Plus size={20} />
            Ajouter une pièce
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <Package className="text-blue-600" size={32} />
              <div>
                <div className="text-2xl font-bold text-gray-900">{spareParts.length}</div>
                <div className="text-sm text-gray-600">Références</div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3">
              <Package className="text-green-600" size={32} />
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalValue.toFixed(2)}€</div>
                <div className="text-sm text-gray-600">Valeur stock</div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-orange-600" size={32} />
              <div>
                <div className="text-2xl font-bold text-gray-900">{lowStockCount}</div>
                <div className="text-sm text-gray-600">Stock faible</div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-600" size={32} />
              <div>
                <div className="text-2xl font-bold text-gray-900">{outOfStockCount}</div>
                <div className="text-sm text-gray-600">Rupture</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par référence ou désignation..."
            className="flex-1"
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'ALL' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('ALL')}
            >
              Toutes
            </Button>
            <Button
              variant={filter === 'LOW_STOCK' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('LOW_STOCK')}
            >
              Stock faible
            </Button>
            <Button
              variant={filter === 'OUT_OF_STOCK' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('OUT_OF_STOCK')}
            >
              Rupture
            </Button>
          </div>
        </div>

        {/* QR Scanner */}
        {showQRScanner && (
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <QrCode className="text-blue-600" size={32} />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Scanner QR Code</h3>
                <p className="text-sm text-gray-600">
                  Scannez le code-barre d'une pièce pour la rechercher instantanément
                </p>
              </div>
              <input
                type="text"
                placeholder="Entrez ou scannez le code-barre..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => setSearchQuery(e.target.value)}
                value={searchQuery}
                autoFocus
              />
            </div>
          </Card>
        )}

        {/* Parts List */}
        {loading ? (
          <Card className="text-center py-12">
            <p className="text-gray-500">Chargement des pièces...</p>
          </Card>
        ) : filteredParts.length === 0 ? (
          <Card className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'Aucune pièce trouvée' : 'Aucune pièce enregistrée'}
            </p>
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="p-4 font-semibold text-gray-700">Désignation</th>
                  <th className="p-4 font-semibold text-gray-700">Référence</th>
                  <th className="p-4 font-semibold text-gray-700">Stock</th>
                  <th className="p-4 font-semibold text-gray-700">Seuil</th>
                  <th className="p-4 font-semibold text-gray-700">Prix unitaire</th>
                  <th className="p-4 font-semibold text-gray-700">Valeur stock</th>
                  <th className="p-4 font-semibold text-gray-700">Statut</th>
                  <th className="p-4 font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredParts.map((part) => {
                  const status = getStockStatus(part.stock, part.seuilAlerte);
                  return (
                    <tr 
                      key={part._id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onNavigate('spare-part-detail', { partId: part._id })}
                    >
                      <td className="p-4 font-medium text-gray-900">{part.designation}</td>
                      <td className="p-4 text-gray-600">{part.reference}</td>
                      <td className="p-4 font-bold text-gray-900">{part.stock}</td>
                      <td className="p-4 text-gray-600">{part.seuilAlerte}</td>
                      <td className="p-4 text-blue-600 font-medium">{part.prixUnitaire}€</td>
                      <td className="p-4 font-medium text-gray-900">{(part.stock * part.prixUnitaire).toFixed(2)}€</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => onNavigate('spare-part-form', { sparePartId: part._id })}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button variant="primary" size="sm">
                            Commander
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
  );
}