//SparePartFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { TextArea } from '../../components/common/TextArea';
import {ArrowLeft, Save} from 'lucide-react';
import { api } from '../../lib/api';

interface SparePartFormScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
  sparePartId?: string;
}

export function SparePartFormScreen({ onNavigate, sparePartId }: SparePartFormScreenProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    designation: '', // ✅ Changé de "nom"
    reference: '',
    stock: 0, // ✅ Changé de "stockActuel"
    seuilAlerte: 0, // ✅ Changé de "stockMinimum"
    prixUnitaire: 0,
    fournisseur: '',
    description: '',
  });

  useEffect(() => {
    if (sparePartId) {
      loadSparePart();
    }
  }, [sparePartId]);

  const loadSparePart = async () => {
    setLoading(true);
    try {
      const part = await api.entities.spare_parts.get(sparePartId);
      console.log('✅ Pièce chargée:', part);
      
      setFormData({
        designation: part.designation || '', // ✅ Changé
        reference: part.reference || '',
        stock: part.stock || 0, // ✅ Changé
        seuilAlerte: part.seuilAlerte || 0, // ✅ Changé
        prixUnitaire: part.prixUnitaire || 0,
        fournisseur: part.fournisseur || '',
        description: part.description || '',
      });
    } catch (error) {
      console.error('❌ Erreur chargement pièce:', error);
      alert('Erreur lors du chargement de la pièce');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const partData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      if (sparePartId) {
        await api.entities.spare_parts.update(sparePartId, partData);
        alert('✅ Pièce modifiée avec succès !');
      } else {
        partData.creator = 'system';
        partData.createdAt = new Date().toISOString();
        await api.entities.spare_parts.create(partData);
        alert('✅ Pièce créée avec succès !');
      }
      
      onNavigate?.('spare-parts');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => onNavigate?.('spare-parts')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {sparePartId ? 'Modifier la pièce' : 'Nouvelle pièce détachée'}
          </h1>
          <p className="text-gray-600 mt-1">Renseignez les informations de la pièce</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Désignation" // ✅ Changé le label
                value={formData.designation} // ✅ Changé
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })} // ✅ Changé
                required
                placeholder="Ex: Filtre à air, Courroie..."
              />
              <Input
                label="Référence"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                required
                placeholder="Ex: REF-12345"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Stock actuel"
                type="number"
                value={formData.stock} // ✅ Changé
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} // ✅ Changé
                required
                min="0"
              />
              <Input
                label="Seuil d'alerte" // ✅ Changé le label
                type="number"
                value={formData.seuilAlerte} // ✅ Changé
                onChange={(e) => setFormData({ ...formData, seuilAlerte: parseInt(e.target.value) || 0 })} // ✅ Changé
                required
                min="0"
              />
              <Input
                label="Prix unitaire (€)"
                type="number"
                step="0.01"
                value={formData.prixUnitaire}
                onChange={(e) => setFormData({ ...formData, prixUnitaire: parseFloat(e.target.value) || 0 })}
                required
                min="0"
              />
            </div>

            <Input
              label="Fournisseur"
              value={formData.fournisseur}
              onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
              placeholder="Nom du fournisseur"
            />

            <TextArea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Description détaillée de la pièce..."
            />

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => onNavigate?.('spare-parts')}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                <Save size={18} className="mr-2" />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
