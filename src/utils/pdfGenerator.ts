// src/utils/pdfGenerator.ts

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

interface InstallationReportData {
  installationData: any;
  client: any;
  machines: any[];
  intervention: any;
  responsableTechnique: any;
}

interface InterventionReportData {
  intervention: any;
  client: any;
  machines: any[];
  usedParts: any[];
}

interface MaintenanceReportData {
  intervention: any;
  client: any;
  machines: any[];
  selectedSections: any[];
  technician: any;
}

// ═══════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES PARTAGÉES
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

const addFooter = (doc: jsPDF, pageCount: number, extraText?: string) => {
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Page ${i} / ${pageCount} - Généré le ${new Date().toLocaleString('fr-FR')} - SoplanElevage`,
      105,
      290,
      { align: 'center' }
    );
    if (extraText) {
      doc.text(extraText, 105, 285, { align: 'center' });
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 1. RAPPORT D'INSTALLATION
// ═══════════════════════════════════════════════════════════════

export const generateInstallationReportPDF = async (data: InstallationReportData) => {
  const { installationData, client, machines, intervention, responsableTechnique } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 55;

  // En-tête
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('SoplanElevage', 20, 20);
  doc.setFontSize(18);
  doc.text('COMPTE-RENDU D\'INSTALLATION', 105, 32, { align: 'center' });

  // Infos Générales
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations générales', 20, yPos);
  yPos += 10;

  let dureeJours = 'N/A';
  if (intervention?.dateDebut && intervention?.dateFin) {
    const diffJours = Math.ceil((new Date(intervention.dateFin).getTime() - new Date(intervention.dateDebut).getTime()) / (1000 * 60 * 60 * 24));
    dureeJours = diffJours > 1 ? `${diffJours} jours` : `${diffJours} jour`;
  }

  const generalBody = [
    ['N° Installation', installationData?.numeroIntervention || 'N/A'],
    ['Client', client?.nom || client?.raisonSociale || 'N/A'],
    ['Adresse', client?.adresse ? `${client.adresse}, ${client.codePostal} ${client.ville}` : 'N/A'],
    ['Date début', formatDate(intervention?.dateDebut)],
    ['Date clôture', formatDate(intervention?.dateFin)],
    ['Durée totale', dureeJours],
    ['Nb machines', `${(installationData?.machines || []).length} machine(s)`],
    ['Chef de chantier', installationData?.chefDeChantierNom || 'Non assigné']
  ];

  doc.autoTable({
    startY: yPos, head: [], body: generalBody, theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [60, 60, 60], cellWidth: 55 }, 1: { cellWidth: 125 } },
    margin: { left: 20, right: 20 }
  });
  yPos = doc.lastAutoTable.finalY + 15;

  // Machines Installées
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.setFontSize(16); doc.setTextColor(37, 99, 235); doc.setFont('helvetica', 'bold');
  doc.text('Machines installées', 20, yPos); yPos += 10;

  const machinesBody = (installationData?.machines || []).map((m: any, i: number) => {
    const mdb = machines.find((x: any) => x._id === m.machineId);
    return [`${i + 1}`, m.nom, m.typeMachineNom || mdb?.typeMachineNom || '-', m.serie || mdb?.serie || '-', m.relationType || 'MAITRE'];
  });

  doc.autoTable({
    startY: yPos,
    head: [['#', 'Nom', 'Type', 'N° Série', 'Relation']],
    body: machinesBody,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    margin: { left: 20, right: 20 }
  });
  yPos = doc.lastAutoTable.finalY + 15;

  // Heures Techniciens & Tâches (Résumé)
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.setFontSize(16); doc.setTextColor(37, 99, 235); doc.setFont('helvetica', 'bold');
  doc.text('Récapitulatif heures', 20, yPos); yPos += 10;

  const techBody = (installationData?.journaliers?.parTechnicien || []).map((t: any) => [t.nom, formatHeures(t.totalHeures)]);
  doc.autoTable({
    startY: yPos,
    head: [['Technicien', 'Heures']],
    body: techBody,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 }
  });
  yPos = doc.lastAutoTable.finalY + 15;

  // Détail par machine (Page dédiée)
  doc.addPage(); yPos = 20;
  doc.setFontSize(18); doc.setTextColor(37, 99, 235); doc.setFont('helvetica', 'bold');
  doc.text('Détail par machine', 20, yPos); yPos += 15;

  (installationData?.machines || []).forEach((machine: any, mi: number) => {
    if (yPos > 220) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12); doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'bold');
    doc.text(`${mi + 1}. ${machine.nom} (${machine.serie || 'N/A'})`, 20, yPos); yPos += 8;

    const techs = machine.heuresParTechnicien || [];
    // Ne garder que les techniciens ayant au moins 1 tâche avec des heures > 0
    const techsAvecHeures = techs.filter((t: any) =>
      t.taches.some((task: any) => task.heures > 0)
    );
    if (techsAvecHeures.length > 0) {
      techsAvecHeures.forEach((t: any) => {
        const totalTech = t.taches.reduce((s: number, x: any) => s + x.heures, 0);
        doc.setFontSize(10); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'bold');
        doc.text(`• ${t.technicienNom} - ${formatHeures(totalTech)}`, 25, yPos); yPos += 5;
        // N'afficher que les tâches ayant des heures > 0
        t.taches.filter((task: any) => task.heures > 0).forEach((task: any) => {
          doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
          doc.text(`   - ${task.description}: ${formatHeures(task.heures)}`, 30, yPos); yPos += 4;
        });
      });
    } else {
      doc.setFontSize(9); doc.setTextColor(150, 150, 150); doc.text('Aucune heure enregistrée', 25, yPos); yPos += 5;
    }
    yPos += 10;
  });

  // Total Global
  if (yPos > 250) { doc.addPage(); yPos = 20; }
  doc.setFillColor(37, 99, 235);
  doc.rect(20, yPos, 170, 15, 'F');
  doc.setFontSize(12); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text('TOTAL GLOBAL', 25, yPos + 10);
  doc.text(formatHeures(installationData?.totalHeures || 0), 185, yPos + 10, { align: 'right' });

  addFooter(doc, doc.internal.pages.length - 1, `Destinataire : ${responsableTechnique?.prenom} ${responsableTechnique?.nom}`);
  return doc;
};

// ═══════════════════════════════════════════════════════════════
// 2. RAPPORT D'INTERVENTION CLASSIQUE (VERSION COMPLÈTE)
// ═══════════════════════════════════════════════════════════════

export const generateInterventionPDF = async (data: InterventionReportData) => {
  const { intervention, client, machines, usedParts } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 55;

  // En-tête
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
  doc.text('SoplanElevage', 20, 20);
  doc.setFontSize(18);
  doc.text('RAPPORT D\'INTERVENTION', 105, 32, { align: 'center' });

  // Infos
  doc.setFontSize(16); doc.setTextColor(37, 99, 235); doc.setFont('helvetica', 'bold');
  doc.text('Informations', 20, yPos); yPos += 10;

  const typeLabels: Record<string, string> = { DEPANNAGE: 'Dépannage', REPAIR: 'Dépannage', MAINTENANCE: 'Maintenance', INSTALLATION: 'Installation' };
  const body = [
    ['N°', intervention?.numeroIntervention || 'N/A'],
    ['Type', typeLabels[intervention?.type] || intervention?.type || 'N/A'],
    ['Client', client?.nom || 'N/A'],
    ['Adresse', client?.adresse ? `${client.adresse}, ${client.codePostal} ${client.ville}` : 'N/A'],
    ['Date', formatDateTime(intervention?.dateDebut)],
    ['Technicien', intervention?.technicianName || intervention?.technicien || 'N/A'],
    ['Durée', intervention?.duree ? `${intervention.duree} min` : 'N/A']
  ];

  doc.autoTable({
    startY: yPos, head: [], body: body, theme: 'grid',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 140 } },
    margin: { left: 20, right: 20 }
  });
  yPos = doc.lastAutoTable.finalY + 15;

  // Machines
  if (machines?.length > 0) {
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235); doc.text('Machines concernées', 20, yPos); yPos += 8;
    // Afficher la colonne "Compteur" uniquement si au moins une machine a un compteur non nul
    const hasCounters = machines.some(m => m.compteur && Number(m.compteur) > 0);
    doc.autoTable({
      startY: yPos,
      head: [hasCounters ? ['Nom', 'Série', 'Compteur'] : ['Nom', 'Série']],
      body: machines.map(m => hasCounters
        ? [m.nom, m.numeroSerie || '-', `${m.compteur}h`]
        : [m.nom, m.numeroSerie || '-']
      ),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 20, right: 20 }
    });
    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Fonction générique pour ajouter du texte
  const addSection = (title: string, content: string) => {
    if (!content || content === 'undefined' || content.trim() === '') return;
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235); doc.text(title, 20, yPos); yPos += 6;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(content, 170);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 5 + 8;
  };

  // ✅ AJOUT : Constatations (depuis le champ spécifique ou protocolData)
  addSection('Constatations', intervention?.constatations || intervention?.protocolData?.constatations);
  
  // Diagnostic principal
  addSection('Diagnostic', intervention?.diagnostic);
  
  // ✅ CORRECTION : Actions réalisées (on cherche dans travauxEffectues OU actionsRealisees)
  addSection('Actions réalisées', intervention?.travauxEffectues || intervention?.actionsRealisees);

  // Pièces
  if (usedParts && usedParts.length > 0) {
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235); doc.text('Pièces utilisées', 20, yPos); yPos += 8;
    
    doc.autoTable({
      startY: yPos,
      head: [['Désignation', 'Référence', 'Qté', 'Prix']],
      body: usedParts.map(p => [p.designation, p.reference || '-', p.quantite?.toString() || '1', p.prixUnitaire ? `${p.prixUnitaire.toFixed(2)}€` : '-']),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 20, right: 20 }
    });
    
    yPos = doc.lastAutoTable.finalY + 5;

    const total = usedParts.reduce((sum, p) => sum + ((p.quantite || 1) * (p.prixUnitaire || 0)), 0);
    if (total > 0) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
      doc.text(`Total pièces : ${total.toFixed(2)} EUR`, 20, yPos);
      yPos += 10;
    }
  }

  addFooter(doc, doc.internal.pages.length - 1);
  return doc;
};

// ═══════════════════════════════════════════════════════════════
// 3. RAPPORT D'ENTRETIEN MAINTENANCE (NOUVEAU)
// ═══════════════════════════════════════════════════════════════

export const generateMaintenanceReportPDF = async (data: MaintenanceReportData) => {
  const { intervention, client, machines, selectedSections, technician } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 55;

  // En-tête
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
  doc.text('SoplanElevage', 20, 20);
  doc.setFontSize(18);
  doc.text('RAPPORT D\'ENTRETIEN', 105, 32, { align: 'center' });

  // Infos Générales
  doc.setFontSize(14); doc.setTextColor(37, 99, 235); doc.setFont('helvetica', 'bold');
  doc.text('Détails intervention', 20, yPos); yPos += 10;

  const infoBody = [
    ['N° Intervention', intervention?.numeroIntervention || 'N/A'],
    ['Date', formatDateTime(intervention?.closedAt || new Date())],
    ['Technicien', technician?.name || 'N/A'],
    ['Client', client?.nom || 'N/A'],
    ['Ferme', client?.nomFerme || client?.nom || 'N/A'],
    ['Adresse', client?.adresse ? `${client.adresse}, ${client.codePostal} ${client.ville}` : 'N/A'],
  ];

  doc.autoTable({
    startY: yPos, head: [], body: infoBody, theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [60, 60, 60], cellWidth: 50 }, 1: { cellWidth: 130 } },
    margin: { left: 20, right: 20 }
  });
  yPos = doc.lastAutoTable.finalY + 15;

  // Regroupement par machine
  const sectionsByMachine: Record<string, any[]> = {};
  selectedSections.forEach(section => {
    const mId = section.machineId || 'unknown';
    if (!sectionsByMachine[mId]) sectionsByMachine[mId] = [];
    sectionsByMachine[mId].push(section);
  });

  Object.keys(sectionsByMachine).forEach((machineId) => {
    if (yPos > 220) { doc.addPage(); yPos = 20; }

    const machineSections = sectionsByMachine[machineId];
    const machineName = machineSections[0]?.machineName || 'Machine inconnue';
    const machineDetails = machines.find(m => m._id === machineId);

    // Titre Machine
    doc.setFontSize(12); doc.setTextColor(255, 255, 255); doc.setFillColor(100, 116, 139);
    doc.rect(20, yPos, pageWidth - 40, 8, 'F');
    doc.text(`MACHINE : ${machineName}`, 25, yPos + 6); yPos += 12;

    if (machineDetails) {
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(`Type: ${machineDetails.typeMachineNom || '-'} | Série: ${machineDetails.numeroSerie || '-'}`, 25, yPos);
      yPos += 6;
    }

    const taskRows = machineSections.flatMap(section => {
      const rows = [[{ content: section.sectionName, colSpan: 2, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }]];
      (section.tasks || []).forEach((task: any) => {
        rows.push([task.description || 'Tâche', task.completed ? '✅ OK' : '⬜ Non fait']);
      });
      return rows;
    });

    doc.autoTable({
      startY: yPos,
      body: taskRows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 40, halign: 'center' } },
      margin: { left: 25, right: 25 }
    });
    yPos = doc.lastAutoTable.finalY + 10;
  });

  // Observations
  if (intervention?.diagnostic) {
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235); doc.text('Observations', 20, yPos); yPos += 6;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(intervention.diagnostic, 170);
    doc.text(lines, 20, yPos);
  }

  addFooter(doc, doc.internal.pages.length - 1);
  return doc;
};