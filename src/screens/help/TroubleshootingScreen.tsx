import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ArrowLeft, Save, FileText, Plus, X, CheckCircle2, Circle, Clock, AlertTriangle, Package, Trash2, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useInterventions } from '../../hooks/useInterventions';
import { useClients } from '../../hooks/useClients';
import { useMachines } from '../../hooks/useMachines';
import { useSpareParts } from '../../hooks/useSpareParts'; // Ajouté pour la recherche
import { api } from '../../lib/api';
import jsPDF from 'jspdf';

// --- INTERFACES ---

interface Verification {
  id: string;
  text: string;
  checked: boolean;
  notes: string;
  category: 'diagnostic' | 'repair' | 'verification' | 'custom';
}

interface Part {
  id: string;
  ref: string;
  name: string;
  qty: number;
}

interface TroubleshootingScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  interventionId?: string;
  clientId?: string;
  machineId?: string;
  readOnly?: boolean;
}

export function TroubleshootingScreen({ 
  onNavigate, 
  interventionId,
  clientId,
  machineId,
  readOnly = false
}: TroubleshootingScreenProps) {
  // --- HOOKS ---
  const { user } = useAuth();
  const { clients, fetchClients } = useClients();
  const { machines, fetchMachines } = useMachines();
  const { createIntervention, updateIntervention } = useInterventions();
  const { spareParts, fetchSpareParts } = useSpareParts();
  
  // Données de base
  const client = clients.find(c => c._id === clientId);
  const machine = machines.find(m => m._id === machineId);
  
  // --- ÉTATS ---
  const [isMounted, setIsMounted] = useState(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Formulaire d'ajout de vérification
  const [newVerifText, setNewVerifText] = useState('');
  const [newVerifSection, setNewVerifSection] = useState<'diagnostic' | 'repair' | 'verification'>('diagnostic');
  const [newVerifNotes, setNewVerifNotes] = useState('');

  // Recherche de pièces
  const [showPartSearch, setShowPartSearch] = useState(false);
  const [partSearchQuery, setPartSearchQuery] = useState('');

  // Données du protocole
  const [data, setData] = useState<any>({
    session: {
      technicien: '',
      numeroIntervention: '',
      date: new Date().toISOString().split('T')[0],
      started: new Date().toLocaleTimeString('fr-FR'),
    },
    constatation: '',
    pieces: [] as Part[],
    verifications: {
      diagnostic: [] as Verification[],
      repair: [] as Verification[],
      verification: [] as Verification[],
      custom: [] as Verification[]
    }
  });

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    setIsMounted(true);
    fetchClients({ limit: 100 });
    fetchMachines({ limit: 100 });
    fetchSpareParts({ limit: 200 }); // Chargement des pièces pour la recherche
    initializeProtocol();
    return () => { setIsMounted(false); };
  }, [interventionId, clientId, machineId]);

  const initializeProtocol = async () => {
    setLoading(true);
    
    const techName = user?.technicien || `${user?.prenom || ''} ${user?.nom || ''}`.trim() || user?.email || 'Technicien';
    const numIntervention = interventionId || `DEP-${Date.now()}`;

    let savedData = null;
    if (interventionId) {
      try {
        console.log('🔄 [DEPANNAGE] Chargement historique ID:', interventionId);
        const inter = await api.entities.interventions.get(interventionId);
        
        if (inter?.protocolData) {
          // Si c'est un string (JSON), on parse. Sinon on prend l'objet.
          savedData = typeof inter.protocolData === 'string' ? JSON.parse(inter.protocolData) : inter.protocolData;
          console.log('✅ [DEPANNAGE] Historique chargé:', savedData);
        }
      } catch (e) { console.error("❌ Erreur chargement:", e); }
    }

    const defaultDiagnostics = [
      { id: 'd1', text: 'Analyse des symptômes', checked: false, notes: '', category: 'diagnostic' as const },
      { id: 'd2', text: 'Vérification codes erreur', checked: false, notes: '', category: 'diagnostic' as const },
      { id: 'd3', text: 'Contrôle visuel', checked: false, notes: '', category: 'diagnostic' as const }
    ];
    const defaultRepairs = [
      { id: 'r1', text: 'Réparation effectuée', checked: false, notes: '', category: 'repair' as const },
      { id: 'r2', text: 'Test fonctionnel', checked: false, notes: '', category: 'repair' as const }
    ];

    setData(prev => ({
      ...prev,
      session: { 
        ...prev.session, 
        technicien: savedData?.session?.technicien || techName, 
        numeroIntervention: savedData?.session?.numeroIntervention || numIntervention,
        date: savedData?.session?.date || prev.session.date
      },
      constatation: savedData?.constatation || '',
      pieces: savedData?.pieces || [],
      verifications: {
        diagnostic: savedData?.verifications?.diagnostic || defaultDiagnostics,
        repair: savedData?.verifications?.repair || defaultRepairs,
        verification: [],
        custom: []
      }
    }));

    setLoading(false);
  };

  // --- ACTIONS ---

  const updateConstatation = (text: string) => setData(prev => ({ ...prev, constatation: text }));

  // Gestion des pièces avec Recherche
  const addPart = (partId: string, ref: string, name: string) => {
    // Vérifier si déjà ajoutée
    if (data.pieces.find(p => p.ref === ref)) {
      alert('Pièce déjà ajoutée');
      return;
    }
    const part: Part = { id: `part-${Date.now()}`, ref, name, qty: 1 };
    setData(prev => ({ ...prev, pieces: [...prev.pieces, part] }));
    setShowPartSearch(false);
    setPartSearchQuery('');
  };

  const updatePart = (id: string, field: keyof Part, value: any) => setData(prev => ({ ...prev, pieces: prev.pieces.map(p => p.id === id ? { ...p, [field]: value } : p) }));
  const removePart = (id: string) => setData(prev => ({ ...prev, pieces: prev.pieces.filter(p => p.id !== id) }));

  const toggleVerification = (section: keyof typeof data.verifications, id: string) => setData(prev => ({ ...prev, verifications: { ...prev.verifications, [section]: prev.verifications[section].map(v => v.id === id ? { ...v, checked: !v.checked } : v) }}));
  const updateNotes = (section: keyof typeof data.verifications, id: string, text: string) => setData(prev => ({ ...prev, verifications: { ...prev.verifications, [section]: prev.verifications[section].map(v => v.id === id ? { ...v, notes: text } : v) }}));

  const addCustomVerification = () => {
    if (!newVerifText.trim()) return;
    const v: Verification = { id: `custom-${Date.now()}`, text: newVerifText, checked: false, notes: newVerifNotes, category: 'custom' };
    setData(prev => ({ ...prev, verifications: { ...prev.verifications, [newVerifSection]: [...prev.verifications[newVerifSection], v] } }));
    setNewVerifText(''); setNewVerifNotes(''); setShowAddModal(false);
  };
  const removeCustomVerification = (section: keyof typeof data.verifications, id: string) => setData(prev => ({ ...prev, verifications: { ...prev.verifications, [section]: prev.verifications[section].filter(v => v.id !== id) }}));

  // --- SAUVEGARDE ---

  const handleSaveInProgress = async () => {
    try {
      const protocolDataContent = { ...data, status: 'in_progress' };
      console.log('📤 Sauvegarde Dépannage:', protocolDataContent);

      if (interventionId) {
        await updateIntervention(interventionId, {
          protocolData: protocolDataContent, // Objet direct
          statut: 'EN_COURS',
          updatedAt: new Date().toISOString()
        });
        if(isMounted) alert('✅ Dépannage sauvegardé');
      } else {
        const newIntervention = await createIntervention({
          type: 'REPAIR',
          clientId: clientId || '',
          machineIds: machineId ? [machineId] : [],
          technicienId: user?._id || '',
          statut: 'EN_COURS',
          dateDebut: new Date().toISOString(),
          numeroIntervention: data.session.numeroIntervention,
          protocolData: protocolDataContent,
          creator: user?._id || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        if(isMounted) alert(`✅ Intervention créée`);
      }
      if (isMounted) onNavigate('interventions');
    } catch (error) { if(isMounted) alert('❌ Erreur sauvegarde'); }
  };

  const handleClose = async () => {
    if (!confirm('Clôturer le dépannage ?')) return;
    try {
      const protocolDataContent = { ...data, status: 'completed' };
      if (interventionId) {
        await updateIntervention(interventionId, {
          protocolData: protocolDataContent,
          statut: 'TERMINEE',
          dateFin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      if(isMounted) alert('✅ Clôturé');
      if(isMounted) onNavigate('interventions');
    } catch (error) { if(isMounted) alert('❌ Erreur clôture'); }
  };

  const isAllChecked = () => [...data.verifications.diagnostic, ...data.verifications.repair, ...data.verifications.verification, ...data.verifications.custom].length > 0 && [...data.verifications.diagnostic, ...data.verifications.repair, ...data.verifications.verification, ...data.verifications.custom].every(v => v.checked);
  const calculateProgress = () => {
    const all = [...data.verifications.diagnostic, ...data.verifications.repair, ...data.verifications.verification, ...data.verifications.custom];
    return { completed: all.filter(v => v.checked).length, total: all.length };
  };

  // --- RENDU ---
  if (loading) return <div className="p-8 text-center">Chargement du dépannage...</div>;

  const progress = calculateProgress();
  const filteredParts = spareParts.filter(p => 
    p.reference?.toLowerCase().includes(partSearchQuery.toLowerCase()) ||
    p.designation?.toLowerCase().includes(partSearchQuery.toLowerCase())
  );

  const renderVerificationItem = (verif: Verification, section: keyof typeof data.verifications) => (
    <div key={verif.id} className="border-b border-gray-200 py-4">
      <div className="flex items-start gap-4">
        <button onClick={() => !readOnly && toggleVerification(section, verif.id)} disabled={readOnly}>
          {verif.checked ? <CheckCircle2 size={28} className="text-green-600" /> : <Circle size={28} className="text-gray-300" />}
        </button>
        <div className="flex-1">
          <p className={`font-medium ${verif.checked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{verif.text}</p>
          <textarea value={verif.notes} onChange={(e) => !readOnly && updateNotes(section, verif.id, e.target.value)} placeholder="Détails..." className="w-full mt-2 text-sm border border-gray-300 rounded p-2" rows={2} disabled={readOnly} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b sticky top-0 z-10 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('interventions')}><ArrowLeft size={20} /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-orange-600">Dépannage (REPAIR)</h1>
            <p className="text-sm text-gray-600">{client?.nom} | {machine?.name} | {data.session.numeroIntervention}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* PROGRESSION */}
        <Card className="bg-orange-50 border-orange-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg">Progression</h3>
            <span className="text-2xl font-bold text-orange-600">{progress.completed}/{progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-orange-500 h-4 rounded-full transition-all" style={{ width: `${progress.total > 0 ? (progress.completed/progress.total)*100 : 0}%` }} />
          </div>
        </Card>

        {/* CONSTATATION */}
        <Card>
          <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-blue-500 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" /> Constatation
          </h2>
          <textarea value={data.constatation} onChange={(e) => updateConstatation(e.target.value)} placeholder="Description de la panne..." className="w-full p-4 border border-gray-300 rounded-lg min-h-[150px]" disabled={readOnly} />
        </Card>

        {/* PIÈCES DÉTACHÉES (AVEC RECHERCHE) */}
        <Card>
          <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-purple-500 flex items-center gap-2">
            <Package size={20} className="text-purple-500" /> Pièces Utilisées
          </h2>
          
          <div className="space-y-3 mb-4">
            {data.pieces.map(part => (
              <div key={part.id} className="flex gap-2 items-start bg-purple-50 p-3 rounded-lg border border-purple-100">
                <div className="flex-1">
                  <Input value={part.ref} onChange={e => !readOnly && updatePart(part.id, 'ref', e.target.value)} placeholder="Réf" className="mb-2 text-xs" disabled={readOnly} />
                  <Input value={part.name} onChange={e => !readOnly && updatePart(part.id, 'name', e.target.value)} placeholder="Nom" disabled={readOnly} />
                </div>
                <div className="w-20"><Input type="number" value={part.qty} onChange={e => !readOnly && updatePart(part.id, 'qty', parseInt(e.target.value) || 1)} disabled={readOnly} /></div>
                {!readOnly && <button onClick={() => removePart(part.id)} className="text-red-500 mt-1"><Trash2 size={20} /></button>}
              </div>
            ))}
          </div>

          {!readOnly && (
            <div>
              {!showPartSearch ? (
                <Button variant="secondary" onClick={() => setShowPartSearch(true)} className="w-full flex items-center justify-center gap-2">
                  <Search size={20} /> Rechercher une pièce
                </Button>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <Input value={partSearchQuery} onChange={(e) => setPartSearchQuery(e.target.value)} placeholder="Référence ou Nom..." className="mb-3" />
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredParts.map(part => (
                      <button key={part._id} onClick={() => addPart(part._id, part.reference, part.designation)} className="w-full p-3 border border-gray-200 rounded-lg hover:bg-white text-left flex justify-between items-center">
                        <div>
                          <div className="font-bold text-sm">{part.reference}</div>
                          <div className="text-xs text-gray-600">{part.designation}</div>
                        </div>
                        <Plus size={16} className="text-gray-400" />
                      </button>
                    ))}
                    {filteredParts.length === 0 && <p className="text-center text-gray-500 text-sm">Aucun résultat</p>}
                  </div>
                  <Button variant="ghost" onClick={() => setShowPartSearch(false)} className="w-full mt-2 text-xs">Fermer</Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* CHECKLISTS */}
        <Card><h2 className="text-xl font-bold mb-4 border-b-2 border-red-500 pb-2">DIAGNOSTIC</h2>{data.verifications.diagnostic.map(v => renderVerificationItem(v, 'diagnostic'))}</Card>
        <Card><h2 className="text-xl font-bold mb-4 border-b-2 border-blue-500 pb-2">RÉPARATION</h2>{data.verifications.repair.map(v => renderVerificationItem(v, 'repair'))}</Card>
        <Card><h2 className="text-xl font-bold mb-4 border-b-2 border-green-500 pb-2">VÉRIFICATION FINALE</h2>{data.verifications.verification.map(v => renderVerificationItem(v, 'verification'))}</Card>
      </div>

      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-20">
          <div className="flex gap-3 justify-end max-w-4xl mx-auto">
            <Button variant="secondary" onClick={() => setShowAddModal(true)}><Plus size={20} /> Ajout</Button>
            <Button onClick={handleSaveInProgress} className="bg-blue-600 text-white"><Clock size={20} /> Enregistrer</Button>
            <Button onClick={handleClose} disabled={!isAllChecked()} className="bg-green-600 text-white"><CheckCircle2 size={20} /> Clôturer</Button>
          </div>
        </div>
      )}

      {/* MODAL AJOUT CHAMP */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-lg w-full m-4">
            <h3 className="text-xl font-bold mb-4">Ajouter une étape personnalisée</h3>
            <select value={newVerifSection} onChange={e => setNewVerifSection(e.target.value as any)} className="w-full mb-4 p-2 border rounded"><option value="diagnostic">Diagnostic</option><option value="repair">Réparation</option><option value="verification">Vérification</option></select>
            <Input value={newVerifText} onChange={e => setNewVerifText(e.target.value)} placeholder="Description de l'étape" className="mb-4" />
            <textarea className="w-full mb-4 p-2 border rounded" placeholder="Note par défaut" rows={2} value={newVerifNotes} onChange={e => setNewVerifNotes(e.target.value)} />
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowAddModal(false)}>Annuler</Button><Button onClick={addCustomVerification}>Ajouter</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
}