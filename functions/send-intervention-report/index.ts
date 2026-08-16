// send-intervention-report.ts
// Nouvelle fonction Deno à déployer dans Lumi
// Chemin de déploiement : créer une nouvelle fonction dans Lumi nommée "send-intervention-report"
//
// Différence avec send-invitation-email :
//   - Template spécifique aux rapports de clôture d'intervention
//   - Gère une pièce jointe PDF (base64)
//   - Inclut le lien de connexion/création de compte client

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const body = await req.json();
    const {
      recipientEmail,
      recipientName,
      appUrl,
      interventionTypeLabel,
      interventionTypeEmoji,
      numeroIntervention,
      dateIntervention,
      machineName,
      technicienName,
      pdfBase64,
      pdfFileName
    } = body;

    // Validation des champs obligatoires
    if (!recipientEmail || !recipientName || !appUrl || !numeroIntervention) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants: recipientEmail, recipientName, appUrl, numeroIntervention' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Même clé Brevo que la fonction d'invitation existante
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";

    const typeLabel = interventionTypeLabel || 'Intervention';
    const typeEmoji = interventionTypeEmoji || '⚙️';

    // Template HTML de l'email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6; }
    .info-label { font-weight: bold; color: #6b7280; font-size: 13px; }
    .info-value { color: #111827; font-size: 13px; text-align: right; }
    .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .pdf-notice { background: #ecfdf5; border: 1px solid #6ee7b7; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 13px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; padding: 20px; }
    @media (max-width: 600px) {
      .container { padding: 10px; }
      .info-row { flex-direction: column; }
    }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1 style="margin:0; font-size:22px;">${typeEmoji} Compte-rendu d'intervention</h1>
    <p style="margin:8px 0 0; opacity:0.85;">SoplanÉlevage — Maintenance professionnelle</p>
  </div>

  <div class="content">
    <p>Bonjour <strong>${recipientName}</strong>,</p>
    <p>Votre intervention <strong>${typeLabel}</strong> du <strong>${dateIntervention}</strong> a été clôturée.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">N° d'intervention</span>
        <span class="info-value"><strong>${numeroIntervention}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Type</span>
        <span class="info-value">${typeEmoji} ${typeLabel}</span>
      </div>
      ${machineName ? `
      <div class="info-row">
        <span class="info-label">Machine(s)</span>
        <span class="info-value">${machineName}</span>
      </div>` : ''}
      ${technicienName ? `
      <div class="info-row">
        <span class="info-label">Technicien</span>
        <span class="info-value">${technicienName}</span>
      </div>` : ''}
      <div class="info-row" style="border-bottom:none;">
        <span class="info-label">Date</span>
        <span class="info-value">${dateIntervention}</span>
      </div>
    </div>

    ${pdfBase64 ? `
    <div class="pdf-notice">
      📎 Le rapport PDF détaillé est joint à cet email.
    </div>` : ''}

    <p style="margin-top:24px;">Consultez l'historique complet de vos interventions et l'état de vos machines depuis votre espace client :</p>

    <div style="text-align:center;">
      <a href="${appUrl}" class="button">🔐 Accéder à mon espace client</a>
    </div>

    <p style="font-size:13px; color:#6b7280; margin-top:20px;">
      Pas encore de compte ? Cliquez sur le bouton ci-dessus et choisissez <strong>"Créer un compte"</strong> avec votre adresse <strong>${recipientEmail}</strong>.
    </p>
  </div>

  <div class="footer">
    <p>SoplanÉlevage — Application de maintenance industrielle</p>
    <p>© ${new Date().getFullYear()} — Tous droits réservés</p>
  </div>
</div>
</body>
</html>`;

    // Construction payload Brevo
    const brevoPayload: any = {
      sender: { name: 'SoplanÉlevage', email: 'lqfchampagne@gmail.com' },
      to: [{ email: recipientEmail, name: recipientName }],
      subject: `${typeEmoji} Rapport ${typeLabel} N°${numeroIntervention} — SoplanÉlevage`,
      htmlContent: emailHtml,
      tags: ['rapport-intervention', typeLabel.toLowerCase().replace(/\s+/g, '_')]
    };

    // Ajouter la pièce jointe PDF si disponible
    if (pdfBase64 && pdfBase64.length > 0) {
      brevoPayload.attachment = [
        {
          content: pdfBase64,
          name: pdfFileName || `Rapport_${numeroIntervention}.pdf`
        }
      ];
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur Brevo:', data);
      return new Response(
        JSON.stringify({ error: 'Echec envoi', details: data.message || data.code || 'Erreur inconnue' }),
        { status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log('Email rapport envoyé à:', recipientEmail, '| ID:', data.messageId);

    return new Response(
      JSON.stringify({ success: true, emailId: data.messageId, recipient: recipientEmail }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.error('Erreur fonction:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
