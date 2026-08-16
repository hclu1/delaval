// src/services/clientNotificationService.ts
// Envoie un email au client à chaque clôture d'intervention
// Appelé depuis : InterventionFormScreen, InstallationProtocolScreen, CommissioningProtocolScreen

import { api } from '../lib/api';

const REPORT_FUNCTION_URL = '/api/legacy-lumi-functions/send-intervention-report';

const TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  REPAIR:        { label: 'Dépannage',      emoji: '🔧' },
  MAINTENANCE:   { label: 'Entretien',       emoji: '⚙️' },
  INSTALLATION:  { label: 'Montage',         emoji: '🔨' },
  COMMISSIONING: { label: 'Mise en service', emoji: '✅' }
};

export interface ClientNotificationParams {
  clientId: string;
  interventionType: 'REPAIR' | 'MAINTENANCE' | 'INSTALLATION' | 'COMMISSIONING';
  numeroIntervention: string;
  dateIntervention: string;
  pdfDoc: any;
  machineName?: string;
  technicienName?: string;
  technicienId?: string;
}

export interface NotificationResult {
  success: boolean;
  clientEmail?: string;
  skipped?: boolean;
  error?: string;
}

export async function sendClientInterventionNotification(
  params: ClientNotificationParams
): Promise<NotificationResult> {
  const {
    clientId,
    interventionType,
    numeroIntervention,
    dateIntervention,
    pdfDoc,
    machineName,
    technicienName,
    technicienId
  } = params;

  // Vérifier si le technicien a désactivé l'envoi
  if (technicienId) {
    try {
      const tech = await api.entities.utilisateurs.get(technicienId);
      if (tech && tech.sendEmailReport === false) {
        console.info('[ClientNotif] Technicien a désactivé l\'envoi → skip');
        return { success: true, skipped: true };
      }
    } catch {}
  }

  try {
    // 1. Récupérer le client
const client = await api.entities.clients.get(clientId);

    if (!client) {
      console.warn('[ClientNotif] Client introuvable, id:', clientId);
      return { success: false, error: 'Client introuvable' };
    }

    const clientEmail = (client.email || '').toLowerCase().trim();
    const clientName = `${client.prenom || ''} ${client.nom || ''}`.trim()
      || client.nomFerme
      || 'Client';

    // 2. Pas d'email → skip silencieux
    if (!clientEmail) {
      console.info('[ClientNotif] Client "' + clientName + '" sans email → envoi ignoré');
      return { success: true, skipped: true };
    }

    // 3. Convertir le PDF en base64
    let pdfBase64 = '';
    if (pdfDoc) {
      try {
      const pdfArrayBuffer = pdfDoc.output('arraybuffer');
pdfBase64 = btoa(
  new Uint8Array(pdfArrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
);
      } catch (pdfErr) {
        console.warn('[ClientNotif] Conversion PDF base64 échouée, envoi sans pièce jointe:', pdfErr);
      }
    }

    const config = TYPE_CONFIG[interventionType] || TYPE_CONFIG.MAINTENANCE;

    // ✅ Lien vers le portail client (racine de l'app = ClientPortalScreen pour un CLIENT)
    const appUrl = window.location.origin;

    const dateFormatted = new Date(dateIntervention).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    const payload = {
      recipientEmail: clientEmail,
      recipientName: clientName,

      // ✅ Le client clique sur ce lien → se connecte → voit ClientPortalScreen
      //    → choisit sa machine → voit l'historique → télécharge les PDFs
      appUrl: appUrl,

      interventionTypeLabel: config.label,
      interventionTypeEmoji: config.emoji,
      numeroIntervention,
      dateIntervention: dateFormatted,
      machineName: machineName || '',
      technicienName: technicienName || '',
      pdfBase64,
      pdfFileName: `Rapport_${config.label.replace(/\s+/g, '_')}_${numeroIntervention}.pdf`,

      // Template HTML de l'email (généré ici pour être self-contained)
      htmlBody: buildEmailHtml({
        clientName,
        config,
        numeroIntervention,
        dateFormatted,
        machineName: machineName || '',
        technicienName: technicienName || '',
        portalUrl: appUrl
      })
    };

    console.log('[ClientNotif] Envoi à:', clientEmail, '| Type:', config.label, '| N°:', numeroIntervention);

    const response = await fetch(REPORT_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      console.error('[ClientNotif] Erreur API:', errorData);
      return {
        success: false,
        clientEmail,
        error: errorData.details || errorData.error || `HTTP ${response.status}`
      };
    }

    console.log('[ClientNotif] ✅ Email envoyé avec succès à:', clientEmail);
    return { success: true, clientEmail };

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('[ClientNotif] Erreur:', msg);
    return { success: false, error: msg };
  }
}

// ─── Template HTML email ──────────────────────────────────────────────────────
function buildEmailHtml(p: {
  clientName: string;
  config: { label: string; emoji: string };
  numeroIntervention: string;
  dateFormatted: string;
  machineName: string;
  technicienName: string;
  portalUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; }
    .info-box { background: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: bold; color: #4b5563; }
    .cta { text-align: center; margin: 25px 0; }
    .cta a { display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; }
    .attachment-notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${p.config.emoji} Rapport d'intervention disponible</h1>
    <p style="margin:8px 0 0; font-size:13px; opacity:0.9;">SoplanÉlevage</p>
  </div>

  <div class="content">
    <p>Bonjour <strong>${p.clientName}</strong>,</p>
    <p>
      Une intervention a été clôturée. Le rapport PDF est joint à cet email
      et également disponible depuis votre espace client.
    </p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Type :</span>
        <span>${p.config.emoji} ${p.config.label}</span>
      </div>
      <div class="info-row">
        <span class="info-label">N° intervention :</span>
        <span>${p.numeroIntervention}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date :</span>
        <span>${p.dateFormatted}</span>
      </div>
      ${p.machineName ? `
      <div class="info-row">
        <span class="info-label">Machine :</span>
        <span>${p.machineName}</span>
      </div>` : ''}
      ${p.technicienName ? `
      <div class="info-row">
        <span class="info-label">Technicien :</span>
        <span>${p.technicienName}</span>
      </div>` : ''}
    </div>

    <div class="attachment-notice">
      <strong>📎 Pièce jointe :</strong> Le rapport complet est disponible en PDF ci-joint.
    </div>

    <div class="cta">
      <a href="${p.portalUrl}">
        🔗 Accéder à mon espace client
      </a>
      <p style="margin-top:10px; font-size:12px; color:#6b7280;">
        Connectez-vous pour consulter l'historique complet de vos machines et télécharger vos rapports.
      </p>
    </div>

    <p style="margin-top:20px;">
      Cordialement,<br>
      <strong>L'équipe SoplanÉlevage</strong>
    </p>
  </div>

  <div class="footer">
    <p>Email généré automatiquement le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} — SoplanÉlevage</p>
  </div>
</body>
</html>`;
}