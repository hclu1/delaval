// src/services/clientPdfService.ts
import { api } from '../lib/api';
import { generateInterventionPDF, generateMaintenanceReportPDF, generateInstallationReportPDF } from '../utils/pdfGenerator';

export async function downloadInterventionPDF(interventionId: string): Promise<void> {
  try {
    console.log('[ClientPDF] Génération PDF pour intervention:', interventionId);

    // 1. Récupérer l'intervention — essai avec get() d'abord, puis list() en fallback
    let intervention: any = null;

    try {
      intervention = await api.entities.interventions.get(interventionId);
    } catch {
      // get() non disponible ou échoue → fallback list()
    }

    if (!intervention) {
      const result = await api.entities.interventions.list({
        filter: { _id: interventionId },
        limit: 1
      });
      intervention = result.list?.[0];
    }

    if (!intervention) {
      throw new Error(`Intervention introuvable (id: ${interventionId})`);
    }

    console.log('[ClientPDF] Intervention trouvée, type:', intervention.type);

    // 2. Récupérer le client
    let client: any = null;
    try {
      client = await api.entities.clients.get(intervention.clientId);
    } catch {
      const r = await api.entities.clients.list({ filter: { _id: intervention.clientId }, limit: 1 });
      client = r.list?.[0];
    }

    // 3. Récupérer les machines
    const machineIds = intervention.machineIds || [];
    let machines: any[] = [];
    if (machineIds.length > 0) {
      try {
        const mResult = await api.entities.machines.list({
          filter: { clientId: intervention.clientId },
          limit: 100
        });
        // Filtrer celles de cette intervention
        machines = (mResult.list || []).filter((m: any) => machineIds.includes(m._id));
      } catch (e) {
        console.warn('[ClientPDF] Erreur chargement machines:', e);
      }
    }

    // 4. Générer le PDF selon le type
    let pdfDoc;

    switch (intervention.type) {
      case 'REPAIR':
      case 'DEPANNAGE': {
        let usedParts: any[] = [];
if (Array.isArray(intervention.protocolData?.pieces)) {
  usedParts = intervention.protocolData.pieces;
} else if (Array.isArray(intervention.usedParts)) {
  usedParts = intervention.usedParts;
} else if (typeof intervention.piecesUtilisees === 'string' && intervention.piecesUtilisees) {
  try { usedParts = JSON.parse(intervention.piecesUtilisees); } catch {}
}
        pdfDoc = await generateInterventionPDF({ intervention, client, machines, usedParts });
        break;
      }

      case 'MAINTENANCE':
      case 'Entretien': {
        let technician = null;
        const techId = intervention.technicianId || intervention.technicien;
        if (techId) {
          try {
            const tr = await api.entities.utilisateurs.list({ filter: { _id: techId }, limit: 1 });
            technician = tr.list?.[0];
          } catch {}
        }
        if (!technician && intervention.technicien) {
          technician = { name: intervention.technicien };
        }
        pdfDoc = await generateMaintenanceReportPDF({
          intervention, client, machines,
          selectedSections: intervention.selectedSections || [],
          technician
        });
        break;
      }

      case 'INSTALLATION': {
        let responsableTechnique = null;
        const respId = intervention.responsableTechniqueId || intervention.chefDeChantier;
        if (respId) {
          try {
            const rr = await api.entities.utilisateurs.list({ filter: { _id: respId }, limit: 1 });
            responsableTechnique = rr.list?.[0];
          } catch {}
        }
        pdfDoc = await generateInstallationReportPDF({
          installationData: intervention.installationData || intervention,
          client, machines, intervention, responsableTechnique
        });
        break;
      }

      case 'COMMISSIONING': {
        pdfDoc = await generateInterventionPDF({ intervention, client, machines, usedParts: [] });
        break;
      }

      default:
        throw new Error(`Type d'intervention non supporté: ${intervention.type}`);
    }

    // 5. Télécharger
    if (pdfDoc) {
      const typeLabels: Record<string, string> = {
        REPAIR: 'Depannage', DEPANNAGE: 'Depannage',
        MAINTENANCE: 'Entretien', Entretien: 'Entretien',
        INSTALLATION: 'Installation', COMMISSIONING: 'MiseEnService'
      };
      const typeLabel = typeLabels[intervention.type] || intervention.type;
      const fileName = `Rapport_${typeLabel}_${intervention.numeroIntervention || interventionId.slice(-6)}.pdf`;
      pdfDoc.save(fileName);
      console.log('[ClientPDF] ✅ PDF téléchargé:', fileName);
    } else {
      throw new Error('Erreur lors de la génération du PDF');
    }

  } catch (error) {
    console.error('[ClientPDF] Erreur génération PDF:', error);
    throw error;
  }
}