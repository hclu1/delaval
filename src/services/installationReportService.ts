// src/services/installationReportService.ts

import { api } from '../lib/api';
import { generateInstallationReportPDF } from '../utils/pdfGenerator';

interface SendInstallationReportParams {
  installationData: any;
  interventionId: string;
  clientId: string;
}

/**
 * Envoie le compte-rendu d'installation au responsable technique
 */
export const sendInstallationReportToResponsable = async (params: SendInstallationReportParams) => {
  try {
    const { installationData, interventionId, clientId } = params;

    // Récupérer le client
    const client = await api.entities.clients.get(clientId);
    
    if (!client?.email) {
      console.error('❌ Client sans email');
      return { success: false, error: 'Client sans email' };
    }

    // Récupérer les machines
    const machinesResult = await api.entities.machines.list({
      filter: { clientId },
      limit: 100
    });
    const machines = machinesResult.list || [];

    // Récupérer l'intervention
    const intervention = await api.entities.interventions.get(interventionId);

    // ✅ VÉRIFIER SI LE CLIENT A UN COMPTE
    const usersResult = await api.entities.utilisateurs.list({
      filter: { 
        email: client.email,
        role: 'CLIENT',
        actif: true
      },
      limit: 1
    });
    
    const hasAccount = usersResult.list && usersResult.list.length > 0;
    
    console.log('📧 Client:', client.nom, '|', client.email);
    console.log('📧 A un compte ?', hasAccount ? 'OUI' : 'NON');

    // Générer le PDF
    const pdfData = {
      installationData,
      client,
      machines,
      intervention,
      responsableTechnique: { prenom: '', nom: '', email: client.email }
    };

    const doc = await generateInstallationReportPDF(pdfData);
    const pdfBlob = doc.output('blob');
    
    // Convertir PDF en base64
    const pdfBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.readAsDataURL(pdfBlob);
    });

    // ✅ SI PAS DE COMPTE → Invitation + PDF plus tard
    if (!hasAccount) {
      console.log('🆕 NOUVEAU CLIENT : Envoi invitation');
      
      try {
        await fetch('/api/legacy-lumi-functions/send-invitation-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: client.email,
            recipientName: client.nom,
            userRole: 'Client',
            appUrl: 'https://preview--soplanelevage-maintenance.api.ing'
          })
        });
        console.log('✅ Invitation envoyée');
      } catch (e) {
        console.error('❌ Erreur invitation:', e);
      }

      // Attendre 5 minutes puis envoyer PDF
      setTimeout(async () => {
        try {
          await fetch('/api/legacy-lumi-functions/send-installation-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientEmail: client.email,
              clientName: client.nom,
              numeroIntervention: installationData.numeroIntervention || 'N/A',
              dateIntervention: new Date().toLocaleDateString('fr-FR'),
              pdfBase64: pdfBase64,
              pdfFilename: `CR-${installationData.numeroIntervention}.pdf`
            })
          });
          console.log('✅ PDF envoyé après 5min');
        } catch (e) {
          console.error('❌ Erreur PDF:', e);
        }
      }, 300000); // 5 minutes

      return {
        success: true,
        message: 'Invitation envoyée. PDF dans 5min.'
      };
    }

    // ✅ SI COMPTE EXISTE → PDF directement
    console.log('✅ CLIENT EXISTANT : Envoi direct du PDF');
    
    try {
      await fetch('/api/legacy-lumi-functions/send-installation-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: client.email,
          clientName: client.nom,
          numeroIntervention: installationData.numeroIntervention || 'N/A',
          dateIntervention: new Date().toLocaleDateString('fr-FR'),
          pdfBase64: pdfBase64,
          pdfFilename: `CR-${installationData.numeroIntervention}.pdf`
        })
      });
      console.log('✅ PDF envoyé');
    } catch (e) {
      console.error('❌ Erreur PDF:', e);
    }

    return {
      success: true,
      message: 'PDF envoyé au client'
    };

  } catch (error) {
    console.error('❌ Erreur:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};

// Fonction placeholder pour compatibilité
export const generateInstallationReportPDF_OLD = async (data: any) => {
  const { installationData, client, machines, intervention, responsableTechnique } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let yPos = 55;

  // ═══════════════════════════════════════════════════════════════
  // FONCTIONS UTILITAIRES
  // ═══════════════════════════════════════════════════════════════

  const formatDate = (dateInput: any) => {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('fr-FR');
  };

  const formatDateTime = (dateInput: any) => {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatHeures = (heures: number) => {
    const h = Math.floor(heures);
    const m = Math.round((heures - h) * 60);
    return m > 0 ? `${h}h ${m.toString().padStart(2, '0')}min` : `${h}h 00min`;
  };

  const checkPageBreak = (neededSpace: number = 40) => {
    if (yPos > 260 - neededSpace) {
      doc.addPage();
      yPos = 20;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 1. EN-TÊTE
  // ═══════════════════════════════════════════════════════════════

  const drawHeader = () => {
    // Bandeau bleu
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Logo / Titre
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('SoplanElevage', 20, 20);
    
    doc.setFontSize(18);
    doc.text('COMPTE-RENDU D\'INSTALLATION', 105, 32, { align: 'center' });
  };

  drawHeader();

  // ═══════════════════════════════════════════════════════════════
  // 2. INFORMATIONS GÉNÉRALES
  // ═══════════════════════════════════════════════════════════════

  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations generales', 20, yPos);
  yPos += 10;

  // Calculer la durée
  let dureeJours = 'N/A';
  if (intervention?.dateDebut && intervention?.dateFin) {
    const debut = new Date(intervention.dateDebut);
    const fin = new Date(intervention.dateFin);
    const diffMs = fin.getTime() - debut.getTime();
    const diffJours = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    dureeJours = diffJours > 1 ? `${diffJours} jours` : `${diffJours} jour`;
  }

  const generalBody = [
    ['N° Installation', installationData?.numeroIntervention || 'N/A'],
    ['Client', client?.nom || client?.raisonSociale || 'N/A'],
    ['Adresse', client?.adresse ? `${client.adresse}, ${client.codePostal} ${client.ville}` : 'N/A'],
    ['Date debut', formatDate(intervention?.dateDebut)],
    ['Date cloture', formatDate(intervention?.dateFin)],
    ['Duree totale', dureeJours],
    ['Nombre machines', `${(installationData?.machines || []).length} machine(s) installee(s)`],
    ['Chef de chantier', installationData?.chefDeChantierNom || 'Non assigne']
  ];

  doc.autoTable({
    startY: yPos,
    head: [],
    body: generalBody,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [60, 60, 60], cellWidth: 55 },
      1: { cellWidth: 125 }
    },
    margin: { left: 20, right: 20 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // ═══════════════════════════════════════════════════════════════
  // 3. MACHINES INSTALLÉES
  // ═══════════════════════════════════════════════════════════════

  checkPageBreak(80);
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text('Machines installees', 20, yPos);
  yPos += 10;

  const machinesInstallees = installationData?.machines || [];
  const machinesBody = machinesInstallees.map((m: any, index: number) => {
    // Récupérer les infos complètes depuis la base si disponible
    const machineDB = machines.find((mdb: any) => mdb._id === m.machineId);
    return [
      `${index + 1}`,
      m.nom || 'Machine',
      m.typeMachineNom || machineDB?.typeMachineNom || '-',
      m.serie || machineDB?.serie || '-',
      m.relationType || 'MAITRE'
    ];
  });

  doc.autoTable({
    startY: yPos,
    head: [['#', 'Nom', 'Type', 'N° Serie', 'Relation']],
    body: machinesBody,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 40 },
      3: { cellWidth: 35 },
      4: { cellWidth: 30, halign: 'center' }
    },
    margin: { left: 20, right: 20 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // ═══════════════════════════════════════════════════════════════
  // 4. HEURES PAR TECHNICIEN (GLOBAL)
  // ═══════════════════════════════════════════════════════════════

  checkPageBreak(80);
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text('Heures par technicien', 20, yPos);
  yPos += 10;

  const parTechnicien = installationData?.journaliers?.parTechnicien || [];
  const techBody = parTechnicien.map((t: any) => {
    // Trouver la spécialité du technicien
    const tech = (installationData?.techniciens || []).find((tc: any) => tc.nom === t.nom);
    return [
      t.nom,
      formatHeures(t.totalHeures),
      tech?.specialiteNom || 'Non definie'
    ];
  });

  doc.autoTable({
    startY: yPos,
    head: [['Technicien', 'Heures', 'Specialite']],
    body: techBody,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 55 }
    },
    margin: { left: 20, right: 20 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // ═══════════════════════════════════════════════════════════════
  // 5. HEURES PAR TÂCHE (GLOBAL)
  // ═══════════════════════════════════════════════════════════════

  checkPageBreak(80);
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text('Heures par tache', 20, yPos);
  yPos += 10;

  const parTache = installationData?.journaliers?.parTache || [];
  const tacheBody = parTache
    .filter((t: any) => t.totalHeures > 0)
    .map((t: any) => [
      t.description,
      formatHeures(t.totalHeures)
    ]);

  doc.autoTable({
    startY: yPos,
    head: [['Tache', 'Heures totales']],
    body: tacheBody,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 115 },
      1: { cellWidth: 55, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 20 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // ═══════════════════════════════════════════════════════════════
  // 6. DÉTAIL PAR MACHINE
  // ═══════════════════════════════════════════════════════════════

  doc.addPage();
  yPos = 20;

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text('Detail par machine', 20, yPos);
  yPos += 15;

  machinesInstallees.forEach((machine: any, machineIndex: number) => {
    checkPageBreak(100);

    // Titre machine
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(`MACHINE ${machineIndex + 1} : ${machine.nom}`, 20, yPos);
    yPos += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Type: ${machine.typeMachineNom || 'N/A'} | N° Serie: ${machine.serie || 'N/A'} | Relation: ${machine.relationType || 'MAITRE'}`, 20, yPos);
    yPos += 10;

    // Calculer les heures pour cette machine
    // (Dans votre implémentation actuelle, les heures sont globales, pas par machine)
    // On va afficher les heures de tous les techniciens qui ont travaillé
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Par technicien', 25, yPos);
    yPos += 8;

    const techniciens = installationData?.techniciens || [];
    techniciens.forEach((tech: any) => {
      const totalTech = (tech.taches || []).reduce((sum: number, t: any) => sum + (t.heures || 0), 0);
      if (totalTech > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(`• ${tech.nom}`, 30, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatHeures(totalTech)}`, 150, yPos, { align: 'right' });
        yPos += 6;

        // Détail des tâches
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        (tech.taches || [])
          .filter((t: any) => t.heures > 0)
          .forEach((tache: any) => {
            doc.text(`  - ${tache.description}`, 35, yPos);
            doc.text(`${formatHeures(tache.heures)}`, 150, yPos, { align: 'right' });
            yPos += 5;
          });
        
        yPos += 3;
      }
    });

    yPos += 10;

    // Total pour cette machine
    const totalMachine = techniciens.reduce((sum: number, tech: any) => {
      return sum + (tech.taches || []).reduce((s: number, t: any) => s + (t.heures || 0), 0);
    }, 0);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Total machine', 25, yPos);
    doc.text(formatHeures(totalMachine), 150, yPos, { align: 'right' });
    yPos += 15;

    // Séparateur si pas dernière machine
    if (machineIndex < machinesInstallees.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, 190, yPos);
      yPos += 15;
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. TOTAL GLOBAL
  // ═══════════════════════════════════════════════════════════════

  checkPageBreak(30);
  doc.setFillColor(37, 99, 235);
  doc.rect(20, yPos, 170, 20, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL GLOBAL', 25, yPos + 13);
  doc.text(formatHeures(installationData?.totalHeures || 0), 185, yPos + 13, { align: 'right' });
  
  yPos += 30;

  // ═══════════════════════════════════════════════════════════════
  // 8. GPS ET LOCALISATION
  // ═══════════════════════════════════════════════════════════════

  if (installationData?.gpsLat && installationData?.gpsLng) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Geolocalisation du chantier', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Coordonnees : ${installationData.gpsLat.toFixed(6)}, ${installationData.gpsLng.toFixed(6)}`, 20, yPos);
    yPos += 6;
    doc.text(`Pris le : ${formatDateTime(installationData.gpsPrisLe)}`, 20, yPos);
    yPos += 10;
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. NOTES ET OBSERVATIONS
  // ═══════════════════════════════════════════════════════════════

  if (installationData?.notes || intervention?.description) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Notes et observations', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const notes = installationData?.notes || intervention?.description || 'Aucune note';
    const splitNotes = doc.splitTextToSize(notes, 170);
    doc.text(splitNotes, 20, yPos);
    yPos += splitNotes.length * 5 + 10;
  }

  // ═══════════════════════════════════════════════════════════════
  // 10. PIED DE PAGE
  // ═══════════════════════════════════════════════════════════════

  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Page ${i} / ${pageCount} - Genere le ${new Date().toLocaleString('fr-FR')} - SoplanElevage`,
      105,
      290,
      { align: 'center' }
    );
    
    // Info destinataire
    doc.text(
      `Destinataire : ${responsableTechnique?.prenom} ${responsableTechnique?.nom} (${responsableTechnique?.email})`,
      105,
      285,
      { align: 'center' }
    );
  }

  return doc;
};