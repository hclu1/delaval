const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const filePath = "D:\\Aplli\\Delaval\\Kit d'entretien\\archive Kit d'entretien\\V300 V310.xlsx";

async function main() {
  try {
    console.log('Lecture du fichier Excel...');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Service 1'];
    
    if (!sheet) {
      throw new Error('Onglet "Service 1" introuvable.');
    }

    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let kitNumber = 'INCONNU';
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] || [];
      const kitIdx = row.findIndex(c => typeof c === 'string' && c.includes('KIT n°'));
      if (kitIdx !== -1 && row.length > kitIdx + 1) {
        kitNumber = String(row[kitIdx + 1]);
        break;
      }
    }

    const machineType = 'VMS V300/V310';
    const serviceNumber = 1;
    const kitId = `kit_v300_${kitNumber}_${serviceNumber}`;

    let headerRowIdx = -1;
    let headers = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i] || [];
      if (row.some(c => typeof c === 'string' && c.toLowerCase().includes('description des taches'))) {
        headerRowIdx = i;
        headers = row.map(h => typeof h === 'string' ? h.trim() : '');
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error('Ligne d\'en-tête non trouvée.');
    }

    const colId = headers.findIndex(h => h && h.toLowerCase() === 'id');
    const colDesc = headers.findIndex(h => h && h.toLowerCase().includes('description'));
    const colModule = headers.findIndex(h => h && h.toLowerCase().includes('module'));
    const colEtat = headers.findIndex(h => h && (h.toLowerCase().includes('etat') || h.toLowerCase().includes('état')));
    const colRef = headers.findIndex(h => h && (h.toLowerCase().includes('réf. pièce') || h.toLowerCase().includes('ref pièce') || h.toLowerCase().includes('ref')));
    const colQte = headers.findIndex(h => h && (h.toLowerCase().includes('qté') || h.toLowerCase().includes('qte')));

    let currentSection = 'Général';
    let ordre = 1;
    const taches = [];

    for (let i = headerRowIdx - 1; i < data.length; i++) {
      const row = data[i] || [];
      if (row.length === 0 || row.every(c => c == null || c === '')) continue;
      
      // Si la ligne n'a qu'un seul élément ou si la première colonne est remplie mais pas la description, c'est peut-être une section
      const nonEmptyCells = row.filter(c => c != null && String(c).trim() !== '');
      if (i > headerRowIdx && nonEmptyCells.length === 1 && typeof row[0] === 'string') {
        currentSection = row[0].trim();
        continue;
      }
      
      // Si on parcourt la ligne juste au dessus des headers, on peut capturer la première section
      if (i === headerRowIdx - 1 && nonEmptyCells.length === 1 && typeof row[0] === 'string') {
        currentSection = row[0].trim();
        continue;
      }

      if (i <= headerRowIdx) continue;

      if (colDesc !== -1 && row[colDesc]) {
        taches.push({
          idTache: (colId !== -1 && row[colId]) ? String(row[colId]).trim() : `T_${ordre}`,
          section: currentSection,
          description: String(row[colDesc]).trim(),
          module: (colModule !== -1 && row[colModule]) ? String(row[colModule]).trim() : null,
          etat: (colEtat !== -1 && row[colEtat]) ? String(row[colEtat]).trim() : null,
          refPiece: (colRef !== -1 && row[colRef]) ? String(row[colRef]).trim() : null,
          quantite: (colQte !== -1 && row[colQte]) ? String(row[colQte]).trim() : null,
          ordre: ordre++,
          creator: "admin"
        });
      }
    }

    console.log(`Préparation à l'insertion du Kit: ${kitId} avec ${taches.length} tâches.`);

    const kit = await prisma.maintenanceKit.upsert({
      where: { kitId: kitId },
      update: {},
      create: {
        kitId: kitId,
        machineType: machineType,
        kitNumber: kitNumber,
        serviceNumber: serviceNumber,
        nom: `Kit Entretien ${machineType}-${kitNumber}-Service (${serviceNumber})`,
        creator: "admin"
      }
    });

    await prisma.tacheEntretien.deleteMany({
      where: { kitId: kitId }
    });

    let count = 0;
    for (const t of taches) {
      await prisma.tacheEntretien.create({
        data: {
          ...t,
          kitId: kitId
        }
      });
      count++;
    }

    console.log(`✅ Import terminé avec succès ! ${count} tâches insérées.`);

  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
