// CommissioningProtocolScreen.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {ArrowLeft, Save, FileText, Plus, X, CheckCircle2, Circle, Clock} from 'lucide-react';
import { useCommissioningProtocol, Verification } from '../../hooks/useCommissioningProtocol';
import { useAuth } from '../../hooks/useAuth';
import { useInterventions } from '../../hooks/useInterventions';
import { useClients } from '../../hooks/useClients';
import { useMachines } from '../../hooks/useMachines';
import jsPDF from 'jspdf';
import { api } from '../../lib/api';

interface CommissioningProtocolScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  interventionId?: string;
  clientId?: string;
  machineId?: string;
  readOnly?: boolean;
}

export function CommissioningProtocolScreen({ 
  onNavigate, 
  interventionId,
  clientId,
  machineId,
  readOnly = false,
  isNewIntervention = false
}: CommissioningProtocolScreenProps) {
  const { user } = useAuth();
  const { clients } = useClients();
  const { machines } = useMachines();
  const { createIntervention, updateIntervention } = useInterventions();
  
  const client = clients.find(c => c._id === clientId);
  const machine = machines.find(m => m._id === machineId);
  
  // Préparation de l'objet utilisateur pour le hook avec fallback robuste
  const effectiveUser = user ? {
    ...user,
    technicien: user.technicien || `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || 'Technicien',
    numeroTechnicien: user.numeroTechnicien || user.numero_technicien || '000'
  } : null;

  const {
    data,
    loading,
    updateSession,
    toggleVerification,
    updateNotes,
    addCustomVerification,
    removeCustomVerification,
    saveProtocol,
    saveToDatabase,
    isAllChecked
  } = useCommissioningProtocol(interventionId, effectiveUser, isNewIntervention);

  // État local pour gérer le démontage du composant (évite les erreurs async)
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newVerifText, setNewVerifText] = useState('');
  const [newVerifSection, setNewVerifSection] = useState<'avantMiseEnRoute' | 'misEnRoute' | 'montrerClient'>('avantMiseEnRoute');
  const [newVerifNotes, setNewVerifNotes] = useState('');

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Chargement du protocole...</p>
      </div>
    );
  }

  const handleAddCustom = () => {
    if (!newVerifText.trim()) {
      alert('Veuillez saisir le texte de la vérification');
      return;
    }
    addCustomVerification(newVerifText, newVerifSection, newVerifNotes);
    setNewVerifText('');
    setNewVerifNotes('');
    setShowAddModal(false);
    alert('✅ Vérification ajoutée avec succès');
  };

  const handleSaveInProgress = async () => {
    try {
      const protocolData = await saveToDatabase('in_progress');
      
      let finalClientId = clientId; 
      let finalInterventionId = interventionId;

      if (interventionId) {
        // CAS 1 : Mise à jour d'une intervention existante
        const updatedIntervention = await updateIntervention(interventionId, {
          protocolData,
          status: 'in_progress',
          updatedAt: new Date().toISOString()
        });
        
        console.log('✅ Protocole mis à jour:', interventionId);
        
        if (updatedIntervention && updatedIntervention.clientId) {
          finalClientId = updatedIntervention.clientId;
        }
        
        if(isMounted) alert(`✅ Protocole enregistré en cours\n${data?.progress.completed}/${data?.progress.total} vérifications complétées`);
        
      } else {
        // CAS 2 : Création d'une nouvelle intervention
        const newIntervention = await createIntervention({
          type: 'COMMISSIONING',
          clientId: clientId || '',
          client_id: clientId || '', 
          machineId: machineId || '',
          machine_id: machineId || '',
          machineIds: machineId ? [machineId] : [],
          technicienId: user?._id || '',
          technicien_id: user?._id || '',
          technicianName: data?.session.technicien || '',
          technicien_name: data?.session.technicien || '',
          numeroIntervention: data?.session.numeroIntervention || '',
          numero_intervention: data?.session.numeroIntervention || '',
          date: new Date().toISOString(),
          dateDebut: new Date().toISOString(),
          status: 'in_progress',
          statut: 'EN_COURS',
          protocolData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log('✅ Nouvelle intervention créée:', newIntervention);
        
        if (newIntervention) {
          finalInterventionId = newIntervention._id;
          finalClientId = newIntervention.clientId || newIntervention.client_id;
        }
        
        if(isMounted) alert(`✅ Intervention créée et enregistrée en cours\nN° ${data?.session.numeroIntervention}`);
      }
      
      // Navigation finale robuste
      if (isMounted) {
        console.log('🧭 Navigation vers:', finalClientId ? `Client ${finalClientId}` : 'Liste Interventions');
        
        if (finalClientId) {
          onNavigate('client-detail', { clientId: finalClientId });
        } else {
          console.warn('⚠️ Aucun Client ID trouvé, retour vers la liste');
          onNavigate('interventions');
        }
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      if(isMounted) alert('❌ Erreur lors de la sauvegarde');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // En-tête
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Protocole de Mise en Service VMS', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Client: ${client?.nom || 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Machine: ${machine?.name || 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Technicien: ${data.session.technicien || 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`N° Intervention: ${data.session.numeroIntervention || 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Date: ${data.session.date}`, 20, yPos);
    yPos += 6;
    doc.text(`Heure de début: ${data.session.started}`, 20, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text(`Progression: ${data.progress.completed}/${data.progress.total} (${Math.round((data.progress.completed / data.progress.total) * 100)}%)`, 20, yPos);
    yPos += 10;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    const addSection = (title: string, verifications: Verification[]) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      verifications.forEach((verif, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const status = verif.checked ? '✓' : '✗';
        const statusColor = verif.checked ? [34, 197, 94] : [239, 68, 68];
        doc.setTextColor(...statusColor);
        doc.text(status, 22, yPos);
        doc.setTextColor(0, 0, 0);
        
        const lines = doc.splitTextToSize(verif.text, pageWidth - 50);
        doc.text(lines, 30, yPos);
        yPos += lines.length * 5;

        if (verif.notes) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          const noteLines = doc.splitTextToSize(`Note: ${verif.notes}`, pageWidth - 50);
          doc.text(noteLines, 30, yPos);
          yPos += noteLines.length * 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
        }

        yPos += 3;
      });

      yPos += 5;
    };

    addSection('AVANT LA MISE EN ROUTE', data.verifications.avantMiseEnRoute);
    addSection('À LA MISE EN ROUTE', data.verifications.misEnRoute);
    addSection('À MONTRER AU CLIENT', data.verifications.montrerClient);

    if (data.verifications.custom && data.verifications.custom.length > 0) {
      addSection('VÉRIFICATIONS PERSONNALISÉES', data.verifications.custom);
    }

    // Footer
    const timestamp = new Date().toLocaleString('fr-FR');
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Généré le ${timestamp}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save(`Protocole_VMS_${data.session.date}_${data.session.technicien || 'technicien'}.pdf`);
    if(isMounted) alert('✅ Rapport PDF généré avec succès');
 
    return doc;
  };

const handleClose = async () => {
  if (!isAllChecked()) {
    alert('⚠️ Toutes les vérifications doivent être complétées avant de clôturer');
    return;
  }

  if (!confirm('Êtes-vous sûr de vouloir clôturer ce protocole et générer le rapport PDF ?')) return;

  try {
    // 1. Sauvegarde en base
    try {
      await saveToDatabase('completed');
    } catch (dbError: any) {
      if (dbError.message?.includes('Aucune intervention liée')) {
        console.warn('⚠️ Pas d\'intervention liée, création...');
        await createIntervention({
          type: 'COMMISSIONING',
          clientId: clientId || '',
          client_id: clientId || '',
          machineId: machineId || '',
          machine_id: machineId || '',
          machineIds: machineId ? [machineId] : [],
          technicienId: user?._id || '',
          technicien_id: user?._id || '',
          technicianName: data?.session.technicien || '',
          technicien_name: data?.session.technicien || '',
          numeroIntervention: data?.session.numeroIntervention || '',
          numero_intervention: data?.session.numeroIntervention || '',
          date: new Date().toISOString(),
          dateDebut: new Date().toISOString(),
          date_fin: new Date().toISOString(),
          dateFin: new Date().toISOString(),
          status: 'completed',
          statut: 'TERMINEE',
          protocolData: { ...data, status: 'completed' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        throw dbError;
      }
    }

    // 2. Mise à jour du statut si intervention existante
    if (interventionId) {
      try {
        await updateIntervention(interventionId, {
          status: 'completed',
          statut: 'TERMINEE',
          date_fin: new Date().toISOString(),
          dateFin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Intervention clôturée:', interventionId);
      } catch (updateError) {
        // Non bloquant — la DB a peut-être déjà mis à jour
        console.warn('⚠️ updateIntervention non bloquant:', updateError);
      }
    }

    // 3. Génération PDF
    const pdfDoc = generatePDF();

    // 4. Envoi email (non bloquant)
if (client?.email) {
  try {
    const techUser = user?._id ? await api.entities.utilisateurs.get(user._id) : null;
    if (techUser?.sendEmailReport === false) {
      console.info('[Commissioning] Envoi email désactivé par le technicien');
    } else {
      const pdfArrayBuffer = pdfDoc.output('arraybuffer');
      const pdfBase64 = btoa(
        new Uint8Array(pdfArrayBuffer).reduce((d, b) => d + String.fromCharCode(b), '')
      );

      const response = await fetch('/api/send-intervention-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: client.email,
          recipientName: client.nom,
          appUrl: 'https://preview--soplanelevage-maintenance.api.ing',
          interventionTypeLabel: 'Mise en Service VMS',
          interventionTypeEmoji: '⚙️',
          numeroIntervention: data?.session.numeroIntervention || '',
          dateIntervention: data?.session.date || new Date().toLocaleDateString('fr-FR'),
          machineName: machine?.name || machine?.nom || '',
          technicienName: data?.session.technicien || '',
          pdfBase64,
          pdfFileName: `Protocole_VMS_${data.session.date}_${data.session.technicien || 'technicien'}.pdf`
        })
      });

      if (response.ok) {
        console.log('✅ Email envoyé:', client.email);
      } else {
        console.warn('⚠️ Email non envoyé, statut:', response.status);
      }
    }
  } catch (emailError) {
    console.warn('⚠️ Erreur email (non bloquant):', emailError);
  }
}

 // 5. Navigation
console.log('🧭 clientId au moment de naviguer:', clientId);

if (isMounted) {
  if (clientId) {
    onNavigate('client-detail', { clientId });
  } else {
    onNavigate('interventions');
  }
}

  } catch (error) {
    console.error('❌ Erreur clôture:', error);
    if (isMounted) {
      alert('❌ Erreur lors de la clôture: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
      // Navigation de secours même en cas d'erreur
      if (clientId) {
        onNavigate('client-detail', { clientId });
      } else {
        onNavigate('interventions');
      }
    }
  }
};

  const renderVerificationItem = (
    verif: Verification,
    section: 'avantMiseEnRoute' | 'misEnRoute' | 'montrerClient',
    index: number
  ) => (
    <div key={verif.id} className="border-b border-gray-200 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        <button
          onClick={() => toggleVerification(section, verif.id)}
          className="mt-1 flex-shrink-0 touch-manipulation"
          aria-label={verif.checked ? 'Décocher' : 'Cocher'}
          disabled={readOnly}
        >
          {verif.checked ? (
            <CheckCircle2 size={28} className="text-green-600 animate-scale-in" />
          ) : (
            <Circle size={28} className="text-gray-300 hover:text-green-400 transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-base font-medium ${verif.checked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
            {verif.text}
          </p>
          
          <div className="mt-2">
            <textarea
              value={verif.notes}
              onChange={(e) => updateNotes(section, verif.id, e.target.value)}
              placeholder="Notes optionnelles..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              disabled={readOnly}
            />
          </div>

          {verif.category === 'custom' && (
            <button
              onClick={() => removeCustomVerification(section, verif.id)}
              className="mt-2 text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              <X size={14} /> Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            
            <Button
              variant="ghost"
              onClick={() => {
                if (clientId) {
                  console.log('🔙 Retour vers le détail client:', clientId);
                  onNavigate('client-detail', { clientId });
                } else {
                  console.log('🔙 Retour vers la liste des interventions');
                  onNavigate('interventions');
                }
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={20} />
            </Button>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Protocole de Mise en Service VMS</h1>
              <p className="text-sm text-gray-600 mt-1">
                {client && `Client: ${client.nom}`}
                {machine && ` | Machine: ${machine.name}`}
                {data.session.numeroIntervention && ` | N° ${data.session.numeroIntervention}`}
              </p>
              {readOnly && (
                <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  Mode lecture seule
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Session Info */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Informations de session</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du technicien</label>
              <Input
                value={data.session.technicien}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">N° Intervention</label>
              <Input
                value={data.session.numeroIntervention || ''}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <Input
                type="date"
                value={data.session.date}
                onChange={(e) => updateSession('date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Heure de début</label>
              <Input value={data.session.started} readOnly className="bg-gray-50" />
            </div>
          </div>
          {data.session.lastSaved && (
            <p className="text-xs text-gray-500 mt-3">
              Dernière sauvegarde: {data.session.lastSaved}
            </p>
          )}
        </Card>

        {/* Progress Bar */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900">Progression</h3>
            <span className="text-2xl font-bold text-blue-600">
              {data.progress.completed}/{data.progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${(data.progress.completed / data.progress.total) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {Math.round((data.progress.completed / data.progress.total) * 100)}% complété
          </p>
        </Card>

        {/* Section 1: AVANT LA MISE EN ROUTE */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-blue-600">
            AVANT LA MISE EN ROUTE
          </h2>
          
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Général</h3>
            {data.verifications.avantMiseEnRoute
              .filter(v => v.category === 'general')
              .map((verif, idx) => renderVerificationItem(verif, 'avantMiseEnRoute', idx))}
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Section ORDI (Paramètres informatiques)</h3>
            {data.verifications.avantMiseEnRoute
              .filter(v => v.category === 'ordi')
              .map((verif, idx) => renderVerificationItem(verif, 'avantMiseEnRoute', idx))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Paramètres AMS (avec le client)</h3>
            {data.verifications.avantMiseEnRoute
              .filter(v => v.category === 'ams')
              .map((verif, idx) => renderVerificationItem(verif, 'avantMiseEnRoute', idx))}
          </div>

          {data.verifications.avantMiseEnRoute.filter(v => v.category === 'custom').length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-3">Vérifications personnalisées</h3>
              {data.verifications.avantMiseEnRoute
                .filter(v => v.category === 'custom')
                .map((verif, idx) => renderVerificationItem(verif, 'avantMiseEnRoute', idx))}
            </div>
          )}
        </Card>

        {/* Section 2: À LA MISE EN ROUTE */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-green-600">
            À LA MISE EN ROUTE
          </h2>
          {data.verifications.misEnRoute.map((verif, idx) => renderVerificationItem(verif, 'misEnRoute', idx))}
        </Card>

        {/* Section 3: À MONTRER AU CLIENT */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-orange-600">
            À MONTRER AU CLIENT
          </h2>
          {data.verifications.montrerClient.map((verif, idx) => renderVerificationItem(verif, 'montrerClient', idx))}
        </Card>
      </div>

      {/* Fixed Footer Actions */}
      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2"
              >
                <Plus size={20} />
                Ajout de champ
              </Button>
              <Button
                onClick={handleSaveInProgress}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Clock size={20} />
                Enregistrer en cours
              </Button>
              <Button
                onClick={handleClose}
                disabled={!isAllChecked()}
                className={`flex items-center gap-2 ${
                  isAllChecked() 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <FileText size={20} />
                Clôturer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Verification */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Ajouter une vérification personnalisée</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
                <select
                  value={newVerifSection}
                  onChange={(e) => setNewVerifSection(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="avantMiseEnRoute">AVANT LA MISE EN ROUTE</option>
                  <option value="misEnRoute">À LA MISE EN ROUTE</option>
                  <option value="montrerClient">À MONTRER AU CLIENT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la vérification *</label>
                <Input
                  value={newVerifText}
                  onChange={(e) => setNewVerifText(e.target.value)}
                  placeholder="Ex: Vérifier la pression du système"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes optionnelles</label>
                <textarea
                  value={newVerifNotes}
                  onChange={(e) => setNewVerifNotes(e.target.value)}
                  placeholder="Informations complémentaires..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddModal(false);
                  setNewVerifText('');
                  setNewVerifNotes('');
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleAddCustom} className="flex items-center gap-2">
                <Plus size={20} />
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}