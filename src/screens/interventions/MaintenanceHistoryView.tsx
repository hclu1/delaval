import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ArrowLeft, CheckCircle, Circle } from 'lucide-react';
import { api } from '../../lib/api';


interface Props {
  onNavigate: (screen: string, params?: any) => void;
  intervention: any;
}


export function MaintenanceHistoryView({ onNavigate, intervention }: Props) {
  console.log('📋 Affichage historique intervention:', intervention);

  // 🔴 STATE POUR LE NOM DU TECHNICIEN
  const [technicianName, setTechnicianName] = useState<string>('Chargement...');

  // 🔴 CHARGER LE TECHNICIEN DEPUIS LA BASE
  useEffect(() => {
    const loadTechnician = async () => {
      if (!intervention?.technicienId) {
        setTechnicianName('Technicien inconnu');
        return;
      }

      try {
        // Chercher le technicien par son ID
        const result = await api.entities.utilisateurs.list({
          filter: { _id: intervention.technicienId },
          limit: 1
        });

        if (result.list && result.list.length > 0) {
          const tech = result.list[0];
          const fullName = `${tech.prenom || ''} ${tech.nom || ''}`.trim();
          setTechnicianName(fullName || 'Technicien');
          console.log('👤 Technicien chargé:', fullName);
        } else {
          // Fallback : extraire le code depuis le numéro d'intervention
          const codeTech = intervention.numeroIntervention?.slice(-3) || '000';
          setTechnicianName(`Technicien ${codeTech}`);
        }
      } catch (error) {
        console.error('❌ Erreur chargement technicien:', error);
        const codeTech = intervention.numeroIntervention?.slice(-3) || '000';
        setTechnicianName(`Technicien ${codeTech}`);
      }
    };

    if (intervention) {
      loadTechnician();
    }
  }, [intervention]);

  if (!intervention) {
    return (
      <Card>
        <p className="text-red-600">Intervention introuvable</p>
        <Button onClick={() => onNavigate('interventions')}>Retour</Button>
      </Card>
    );
  }

  const { selectedSections = [], progress = 0, totalTasks = 0, completedTasks = 0 } = intervention;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => onNavigate('interventions')}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Retour
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historique Entretien</h1>
          <p className="text-gray-600 mt-1">
            N° {intervention.numeroIntervention || 'N/A'}
          </p>
          <p className="text-sm text-gray-500">
            👤 {technicianName} · {new Date(intervention.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Informations générales */}
      <Card>
        <h2 className="text-xl font-bold mb-4">📊 Résumé</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Statut</p>
            <p className="font-bold text-green-600">{intervention.status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Progression</p>
            <p className="font-bold">{progress}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tâches complétées</p>
            <p className="font-bold">{completedTasks} / {totalTasks}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date de clôture</p>
            <p className="font-bold">
              {intervention.closedAt 
                ? new Date(intervention.closedAt).toLocaleString('fr-FR')
                : '-'
              }
            </p>
          </div>
        </div>
      </Card>

      {/* Sections et tâches */}
      {selectedSections && selectedSections.length > 0 ? (
        selectedSections.map((section: any, idx: number) => (
          <Card key={idx}>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              ✅ {section.sectionName}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Machine: {section.machineName} ({section.machineId})
            </p>
            
            {section.tasks && section.tasks.length > 0 ? (
              <ul className="space-y-2">
                {section.tasks.map((task: any, taskIdx: number) => (
                  <li 
                    key={taskIdx} 
                    className={`flex items-start gap-3 p-2 rounded ${
                      task.completed ? 'bg-green-50' : 'bg-gray-50'
                    }`}
                  >
                    {task.completed ? (
                      <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={task.completed ? 'text-gray-900' : 'text-gray-500'}>
                        {task.description}
                      </p>
                      {task.completedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Complété le {new Date(task.completedAt).toLocaleString('fr-FR')}
                        </p>
                      )}
                      {task.refPiece && (
                        <p className="text-xs text-blue-600 mt-1">
                          Pièce: {task.refPiece} {task.quantite && `(x${task.quantite})`}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Aucune tâche dans cette section</p>
            )}
          </Card>
        ))
      ) : (
        <Card>
          <p className="text-yellow-600">
            ⚠️ Aucune donnée d'entretien enregistrée pour cette intervention
          </p>
        </Card>
      )}

      {/* Diagnostic */}
      {intervention.diagnostic && (
        <Card>
          <h3 className="text-lg font-bold mb-2">📝 Notes</h3>
          <p className="text-gray-700">{intervention.diagnostic}</p>
        </Card>
      )}
    </div>
  );
}
