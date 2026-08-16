// src/services/emailService.ts

/**
 * Service d'envoi d'email pour les comptes-rendus d'installation
 * Utilise Nodemailer (à configurer avec SMTP)
 */

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface SendInstallationReportEmailParams {
  to: string; // Email du responsable technique
  responsableTechniqueNom: string;
  clientNom: string;
  numeroInstallation: string;
  dateDebut: string;
  dateFin: string;
  totalHeures: number;
  nombreMachines: number;
  pdfBuffer: Buffer; // Le PDF en buffer
  pdfFilename: string;
}

/**
 * Configuration SMTP
 * À CONFIGURER selon votre fournisseur d'email
 */
const EMAIL_CONFIG: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com', // Exemple: smtp.gmail.com, smtp.office365.com
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true pour port 465, false pour autres ports
  auth: {
    user: process.env.SMTP_USER || 'votre-email@soplan-elevage.com',
    pass: process.env.SMTP_PASS || 'votre-mot-de-passe'
  }
};

/**
 * Fonction principale d'envoi d'email avec PDF
 */
export async function sendInstallationReportEmail(params: SendInstallationReportEmailParams): Promise<boolean> {
  const {
    to,
    responsableTechniqueNom,
    clientNom,
    numeroInstallation,
    dateDebut,
    dateFin,
    totalHeures,
    nombreMachines,
    pdfBuffer,
    pdfFilename
  } = params;

  try {
    // ═══════════════════════════════════════════════════════════
    // OPTION 1 : Backend avec Nodemailer (recommandé)
    // ═══════════════════════════════════════════════════════════
    
    // Si vous avez un backend Node.js, créez une route API :
    // POST /api/send-installation-report
    
    const response = await fetch('/api/send-installation-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        responsableTechniqueNom,
        clientNom,
        numeroInstallation,
        dateDebut,
        dateFin,
        totalHeures,
        nombreMachines,
        pdfBase64: pdfBuffer.toString('base64'),
        pdfFilename
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur envoi email: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Email envoyé avec succès:', result);
    return true;

  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return false;
  }
}

/**
 * Template HTML de l'email
 */
export function getEmailTemplate(params: {
  responsableTechniqueNom: string;
  clientNom: string;
  numeroInstallation: string;
  dateDebut: string;
  dateFin: string;
  totalHeures: number;
  nombreMachines: number;
}): string {
  const formatHeures = (heures: number) => {
    const h = Math.floor(heures);
    const m = Math.round((heures - h) * 60);
    return m > 0 ? `${h}h ${m.toString().padStart(2, '0')}min` : `${h}h 00min`;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
      color: #1f2937;
    }
    .info-box {
      background: white;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: bold;
      color: #4b5563;
    }
    .info-value {
      color: #1f2937;
    }
    .highlight {
      background: #dbeafe;
      color: #1e40af;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .attachment-notice {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Compte-rendu d'installation</h1>
    <p style="margin: 10px 0 0 0; font-size: 14px;">SoplanElevage</p>
  </div>
  
  <div class="content">
    <p class="greeting">
      Bonjour <strong>${params.responsableTechniqueNom}</strong>,
    </p>
    
    <p>
      Une installation a été clôturée avec succès. Vous trouverez ci-joint le compte-rendu détaillé en PDF.
    </p>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">N° Installation :</span>
        <span class="info-value">${params.numeroInstallation}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Client :</span>
        <span class="info-value">${params.clientNom}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date début :</span>
        <span class="info-value">${params.dateDebut}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date clôture :</span>
        <span class="info-value">${params.dateFin}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Machines installées :</span>
        <span class="info-value">${params.nombreMachines} machine(s)</span>
      </div>
    </div>
    
    <div class="highlight">
      💰 Total : ${formatHeures(params.totalHeures)}
    </div>
    
    <div class="attachment-notice">
      <strong>📎 Pièce jointe :</strong> Le compte-rendu complet est disponible en PDF ci-joint. 
      Il contient le détail par technicien, par tâche et par machine.
    </div>
    
    <p style="margin-top: 30px;">
      Cordialement,<br>
      <strong>L'équipe SoplanElevage</strong>
    </p>
  </div>
  
  <div class="footer">
    <p>
      Cet email a été généré automatiquement par le système de gestion SoplanElevage.<br>
      ${(() => { const d = new Date(); return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`; })()}
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * EXEMPLE DE BACKEND API (Node.js + Express + Nodemailer)
 * À créer dans votre backend
 */
/*

// backend/routes/email.js
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post('/send-installation-report', async (req, res) => {
  try {
    const {
      to,
      responsableTechniqueNom,
      clientNom,
      numeroInstallation,
      dateDebut,
      dateFin,
      totalHeures,
      nombreMachines,
      pdfBase64,
      pdfFilename
    } = req.body;

    // Configuration Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Template HTML (importé depuis emailService.ts)
    const htmlContent = getEmailTemplate({
      responsableTechniqueNom,
      clientNom,
      numeroInstallation,
      dateDebut,
      dateFin,
      totalHeures,
      nombreMachines
    });

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: '"SoplanElevage" <noreply@soplan-elevage.com>',
      to: to,
      subject: `📋 Compte-rendu installation ${numeroInstallation} - ${clientNom}`,
      html: htmlContent,
      attachments: [
        {
          filename: pdfFilename,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('✅ Email envoyé:', info.messageId);
    res.json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

*/