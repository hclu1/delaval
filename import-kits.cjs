const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

const filePath = "D:\\Aplli\\Delaval\\Kit d'entretien\\archive Kit d'entretien\\V300 V310.xlsx";
const maintenanceKitsPath = path.join(__dirname, 'src', 'entities', 'maintenance_kits.json');
const tachesEntretienPath = path.join(__dirname, 'src', 'entities', 'taches_entretien.json');

try {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets['Service 1'];
  
  if (!sheet) {
    throw new Error('Onglet "Service 1" introuvable.');
  }

  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Extraire les infos globales
  // D'après l'inspection précédente, row 2 contient ['KIT n°', 2150025306]
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

  // Création du Kit
  const newKit = {
    kitId: kitId,
    machineType: machineType,
    kitNumber: kitNumber,
    serviceNumber: serviceNumber,
    nom: `Kit Entretien ${machineType}-${kitNumber}-Service (${serviceNumber})`,
    actif: true,
    creator: "admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Trouver la ligne d'en-tête (où se trouve 'Section', 'ID', 'Description des taches')
  let headerRowIdx = -1;
  let headers = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i] || [];
    if (row.some(c => typeof c === 'string' && c.toLowerCase().includes('section'))) {
      headerRowIdx = i;
      headers = row.map(h => typeof h === 'string' ? h.trim() : '');
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error('Ligne d\'en-tête non trouvée.');
  }

  // Indices des colonnes
  const colSection = headers.findIndex(h => h.toLowerCase().includes('section'));
  const colId = headers.findIndex(h => h.toLowerCase() === 'id');
  const colDesc = headers.findIndex(h => h.toLowerCase().includes('description'));
  const colModule = headers.findIndex(h => h.toLowerCase().includes('module'));
  const colEtat = headers.findIndex(h => h.toLowerCase().includes('etat') || h.toLowerCase().includes('état'));
  const colRef = headers.findIndex(h => h.toLowerCase().includes('réf. pièce') || h.toLowerCase().includes('ref pièce') || h.toLowerCase().includes('ref'));
  const colQte = headers.findIndex(h => h.toLowerCase().includes('qté') || h.toLowerCase().includes('qte'));

  const newTaches = [];
  let currentSection = '';
  let ordre = 1;

  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i] || [];
    
    // Si la ligne est complètement vide, on ignore
    if (row.length === 0 || row.every(c => c == null || c === '')) {
      continue;
    }

    // Gestion de la section : si la colonne Section est remplie, c'est la nouvelle section courante
    if (colSection !== -1 && row[colSection]) {
      currentSection = String(row[colSection]).trim();
    }

    // Si on a une description, on considère que c'est une tâche
    if (colDesc !== -1 && row[colDesc]) {
      newTaches.push({
        idTache: (colId !== -1 && row[colId]) ? String(row[colId]).trim() : `T_${ordre}`,
        kitId: kitId,
        section: currentSection || 'Général',
        description: String(row[colDesc]).trim(),
        module: (colModule !== -1 && row[colModule]) ? String(row[colModule]).trim() : null,
        etat: (colEtat !== -1 && row[colEtat]) ? String(row[colEtat]).trim() : null,
        refPiece: (colRef !== -1 && row[colRef]) ? String(row[colRef]).trim() : null,
        quantite: (colQte !== -1 && row[colQte]) ? String(row[colQte]).trim() : null,
        ordre: ordre++,
        creator: "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Lecture des bases existantes (si elles existent) et ajout
  let existingKits = [];
  if (fs.existsSync(maintenanceKitsPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(maintenanceKitsPath, 'utf8'));
      existingKits = Array.isArray(parsed) ? parsed : (parsed.list || []);
    } catch(e) {}
  }
  
  let existingTaches = [];
  if (fs.existsSync(tachesEntretienPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(tachesEntretienPath, 'utf8'));
      existingTaches = Array.isArray(parsed) ? parsed : (parsed.list || []);
    } catch(e) {}
  }

  // Ajouter le nouveau kit s'il n'existe pas déjà
  if (!existingKits.some(k => k.kitId === kitId)) {
    existingKits.push(newKit);
  }

  // Remplacer les tâches existantes pour ce kit ou les ajouter
  existingTaches = existingTaches.filter(t => t.kitId !== kitId);
  existingTaches.push(...newTaches);

  // Sauvegarder (en supposant que les fichiers stockent juste un tableau JSON, sinon adapter)
  fs.writeFileSync(maintenanceKitsPath, JSON.stringify(existingKits, null, 2));
  fs.writeFileSync(tachesEntretienPath, JSON.stringify(existingTaches, null, 2));

  console.log(`Succès: Kit ${kitId} ajouté avec ${newTaches.length} tâches.`);

} catch (error) {
  console.error("Erreur d'import:", error.message);
}
