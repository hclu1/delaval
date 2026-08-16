import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import multer from 'multer';
const pdfParse = require('pdf-parse');

const prisma = new PrismaClient();
const app = express();

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// ==========================================
// AUTHENTIFICATION (Mock/Basic & Google)
// ==========================================
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';
import path from 'path';

// Charge les variables d'environnement depuis le fichier .env.local du frontend
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Le client ID de votre app (VITE_GOOGLE_CLIENT_ID vient du .env.local)
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || 'VOTRE_CLIENT_ID_GOOGLE_ICI';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.post('/api/auth/signin', async (req, res) => {
  const { clientName, clientNumber } = req.body;
  
  if (!clientName || !clientNumber) {
    return res.status(400).json({ error: 'Nom et Numéro de client requis' });
  }

  // Cherche le client en base
  const client = await prisma.client.findUnique({
    where: { numeroClient: clientNumber }
  });

  if (!client || client.nom.toLowerCase() !== clientName.toLowerCase()) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  // Pour simplifier, on renvoie les infos du client et un "token" bidon
  return res.json({ 
    user: { id: client.id, role: 'CLIENT_ACCESS', name: client.nom, clientId: client.id },
    token: 'mock-jwt-token' 
  });
});

app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token manquant' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,  // On vérifie que le token est bien pour notre app
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(401).json({ error: 'Token invalide' });

    // Cherche le technicien ou le crée
    let technicien = await prisma.technicien.findUnique({ where: { email: payload.email } });
    if (!technicien) {
      technicien = await prisma.technicien.create({
        data: {
          email: payload.email,
          nom: payload.family_name || 'Inconnu',
          prenom: payload.given_name || 'Inconnu',
          roles: 'TECHNICIEN'
        }
      });
    }

    return res.json({
      user: { id: technicien.id, role: 'ADMIN', name: `${technicien.prenom} ${technicien.nom}`, email: technicien.email },
      token: 'mock-jwt-technicien-token'
    });
  } catch (error) {
    console.error('Erreur verification Google:', error);
    return res.status(401).json({ error: 'Jeton invalide' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non autorisé' });
  
  const technicien = await prisma.technicien.findFirst();
  if (technicien) {
    return res.json({
      user: { id: technicien.id, role: 'ADMIN', name: `${technicien.prenom} ${technicien.nom}`, email: technicien.email }
    });
  }
  return res.status(401).json({ error: 'Utilisateur non trouvé' });
});

// ==========================================
// CLIENTS
// ==========================================

app.get('/api/clients', async (req, res) => {
  const clients = await prisma.client.findMany();
  res.json({ list: clients, total: clients.length });
});

app.get('/api/clients/:id', async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!client) return res.status(404).json({ error: 'Client non trouvé' });
  res.json(client);
});

app.post('/api/clients', async (req, res) => {
  try {
    const client = await prisma.client.create({ data: req.body });
    res.json(client);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// MACHINES
// ==========================================

app.get('/api/machines', async (req, res) => {
  const { clientId } = req.query;
  const where = clientId ? { clientId: String(clientId) } : {};
  const machines = await prisma.machine.findMany({ where });
  res.json({ list: machines, total: machines.length });
});

// ==========================================
// INTERVENTIONS
// ==========================================

app.get('/api/interventions', async (req, res) => {
  const { clientId } = req.query;
  const where = clientId ? { clientId: String(clientId) } : {};
  const interventions = await prisma.intervention.findMany({ where });
  res.json({ list: interventions, total: interventions.length });
});

app.get('/api/interventions/:id', async (req, res) => {
  const intervention = await prisma.intervention.findUnique({ where: { id: req.params.id } });
  if (!intervention) return res.status(404).json({ error: 'Intervention non trouvée' });
  res.json(intervention);
});

app.post('/api/interventions', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;
    if (data.dateDebut) data.dateDebut = new Date(data.dateDebut);
    if (data.dateFin) data.dateFin = new Date(data.dateFin);
    if (typeof data.donneesTechniques !== 'string' && data.donneesTechniques) {
      data.donneesTechniques = JSON.stringify(data.donneesTechniques);
    }
    
    // Convert arrays/objects to string if they are not in schema (put in donneesTechniques)
    const knownFields = ['id', 'statut', 'dateDebut', 'dateFin', 'description', 'notes', 'donneesTechniques', 'clientId', 'machineId', 'type', 'numeroIntervention', 'diagnostic', 'technicienId', 'technicianName'];
    const extraData: any = {};
    for (const key of Object.keys(data)) {
      if (!knownFields.includes(key)) {
        extraData[key] = data[key];
        delete data[key];
      }
    }
    if (Object.keys(extraData).length > 0) {
      const currentDonnees = data.donneesTechniques ? JSON.parse(data.donneesTechniques) : {};
      data.donneesTechniques = JSON.stringify({ ...currentDonnees, ...extraData });
    }

    if (!data.statut) data.statut = "PLANIFIEE";

    const intervention = await prisma.intervention.create({ data });
    res.json(intervention);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/interventions/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    if (data.dateDebut) data.dateDebut = new Date(data.dateDebut);
    if (data.dateFin) data.dateFin = new Date(data.dateFin);
    if (typeof data.donneesTechniques !== 'string' && data.donneesTechniques) {
      data.donneesTechniques = JSON.stringify(data.donneesTechniques);
    }
    
    // Convert arrays/objects to string if they are not in schema (put in donneesTechniques)
    const knownFields = ['id', 'statut', 'dateDebut', 'dateFin', 'description', 'notes', 'donneesTechniques', 'clientId', 'machineId', 'type', 'numeroIntervention', 'diagnostic', 'technicienId', 'technicianName'];
    const extraData: any = {};
    for (const key of Object.keys(data)) {
      if (!knownFields.includes(key)) {
        extraData[key] = data[key];
        delete data[key];
      }
    }
    if (Object.keys(extraData).length > 0) {
      const currentDonnees = data.donneesTechniques ? JSON.parse(data.donneesTechniques) : {};
      data.donneesTechniques = JSON.stringify({ ...currentDonnees, ...extraData });
    }
    
    const intervention = await prisma.intervention.update({
      where: { id: req.params.id },
      data
    });
    res.json(intervention);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/interventions/:id', async (req, res) => {
  try {
    await prisma.intervention.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/machines/:id', async (req, res) => {
  const machine = await prisma.machine.findUnique({ where: { id: req.params.id } });
  if (!machine) return res.status(404).json({ error: 'Machine non trouvée' });
  res.json(machine);
});

app.post('/api/machines', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Remove fields that are not in the Prisma schema
    delete data.creator;
    delete data.createdAt;

    // Stringify array fields
    if (data.customFields) data.customFields = JSON.stringify(data.customFields);
    if (data.pumpExtraFields) data.pumpExtraFields = JSON.stringify(data.pumpExtraFields);
    if (data.v300ExtraFields) data.v300ExtraFields = JSON.stringify(data.v300ExtraFields);
    if (data.otherExtraFields) data.otherExtraFields = JSON.stringify(data.otherExtraFields);

    const machine = await prisma.machine.create({ data });
    res.json(machine);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/machines/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    
    delete data.creator;
    delete data.createdAt;

    if (data.customFields) data.customFields = JSON.stringify(data.customFields);
    if (data.pumpExtraFields) data.pumpExtraFields = JSON.stringify(data.pumpExtraFields);
    if (data.v300ExtraFields) data.v300ExtraFields = JSON.stringify(data.v300ExtraFields);
    if (data.otherExtraFields) data.otherExtraFields = JSON.stringify(data.otherExtraFields);

    const machine = await prisma.machine.update({ 
      where: { id: req.params.id }, 
      data 
    });
    res.json(machine);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/machines/:id', async (req, res) => {
  try {
    await prisma.machine.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// KITS D'ENTRETIEN ET TACHES
// ==========================================

app.get('/api/maintenance_kits', async (req, res) => {
  try {
    let whereClause = {};
    
    // Support filtering logic passed as stringified JSON if needed
    if (req.query.where) {
      try {
        const parsedWhere = JSON.parse(String(req.query.where));
        if (parsedWhere && parsedWhere.filter) {
          whereClause = parsedWhere.filter;
        } else {
          whereClause = parsedWhere;
        }
        if (whereClause.limit) {
          delete whereClause.limit;
        }
      } catch (e) {
        // Fallback to direct query parameters
        const { machineType, actif } = req.query;
        if (machineType) whereClause.machineType = String(machineType);
        if (actif !== undefined) whereClause.actif = actif === 'true';
      }
    } else {
      const { machineType, actif } = req.query;
      if (machineType) whereClause.machineType = String(machineType);
      if (actif !== undefined) whereClause.actif = actif === 'true';
    }

    const kits = await prisma.maintenanceKit.findMany({ 
      where: whereClause,
      include: { taches: true }
    });
    res.json({ list: kits, total: kits.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/maintenance_kits/:id', async (req, res) => {
  try {
    const kit = await prisma.maintenanceKit.findUnique({ 
      where: { id: req.params.id },
      include: { taches: true }
    });
    if (!kit) return res.status(404).json({ error: 'Kit non trouvé' });
    res.json(kit);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/maintenance_kits', async (req, res) => {
  try {
    const kit = await prisma.maintenanceKit.create({ data: req.body });
    res.json(kit);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/maintenance_kits/:id', async (req, res) => {
  try {
    const kit = await prisma.maintenanceKit.update({ 
      where: { id: req.params.id }, 
      data: req.body 
    });
    res.json(kit);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/maintenance_kits/:id', async (req, res) => {
  try {
    await prisma.maintenanceKit.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/taches_entretien', async (req, res) => {
  try {
    const { kitId } = req.query;
    const where = kitId ? { kitId: String(kitId) } : {};
    const taches = await prisma.tacheEntretien.findMany({ where });
    res.json({ list: taches, total: taches.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
    
    const data = await pdfParse(req.file.buffer);
    const text = data.text;
    
    let machineType = 'Inconnu';
    let kitNumber = 'Inconnu';
    let serviceNumber = 1;
    let nom = 'Kit d\'entretien';

    // Extraction des métadonnées
    const vmsMatch = text.match(/VMS\s*\d+/i);
    if (vmsMatch) machineType = vmsMatch[0];

    const kitNumMatch = text.match(/\((\d{8,})\)/);
    if (kitNumMatch) kitNumber = kitNumMatch[1];
    
    const serviceMatch = text.match(/VISITE D'ENTRETIEN\s*(\d+)/i) || text.match(/Service\s*(\d+)/i);
    if (serviceMatch) serviceNumber = parseInt(serviceMatch[1]);
    
    // Extraction des tâches (heuristique simplifiée)
    const tasksData = [];
    let inTasksSection = false;
    const lines = text.split('\n');
    let currentTask = null;
    let ordre = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('Description de la tâche')) {
        inTasksSection = true;
        continue;
      }
      if (line.includes('Options VMS') || line.includes('Circulation des animaux') || line.includes('Signatures')) {
        // Continue, on peut avoir d'autres sections, mais pour simplifier on garde le même inTasksSection
      }
      if (!inTasksSection || !line) continue;

      // Chercher une ligne qui commence par un ID numérique (ex: "127 Vérifier ...")
      const taskStartMatch = line.match(/^(\d+)\s+([A-Z][a-zà-ÿ]+(?:er|ir|re|er))?\s+(.+)/);
      if (taskStartMatch) {
        if (currentTask) tasksData.push(currentTask);
        
        let desc = taskStartMatch[3];
        let refPiece = '';
        let quantite = 0;
        
        // Extraction heuristique de la ref (ex: 86317230 1) à la fin de la ligne
        const refMatch = desc.match(/(\d{8,})\s+(\d+)$/);
        if (refMatch) {
          refPiece = refMatch[1];
          quantite = parseInt(refMatch[2]);
          desc = desc.replace(refMatch[0], '').trim();
        } else {
            // Check if ref and qty are on next line? Or just trailing " Traite"
            desc = desc.replace(/\s+Traite$/, '').trim();
            desc = desc.replace(/\s+VMS$/, '').trim();
        }

        currentTask = {
          section: 'Entretien',
          description: desc,
          module: 'VMS',
          etat: 'todo',
          refPiece,
          quantite,
          ordre: ordre++
        };
      } else if (currentTask && !line.match(/Page\s+\d/)) {
        // Continuation de la description (multiligne)
        // Vérifier s'il y a une référence sur cette ligne
        const refMatch = line.match(/(\d{8,})\s+(\d+)$/);
        let extraDesc = line;
        if (refMatch) {
          currentTask.refPiece = refMatch[1];
          currentTask.quantite = parseInt(refMatch[2]);
          extraDesc = line.replace(refMatch[0], '').trim();
        }
        extraDesc = extraDesc.replace(/\s+Traite$/, '').trim();
        extraDesc = extraDesc.replace(/\s+VMS$/, '').trim();
        
        if (extraDesc && !['Traite', 'VMS'].includes(extraDesc)) {
          currentTask.description += ' ' + extraDesc;
        }
      }
    }
    
    if (currentTask) tasksData.push(currentTask);

    const kitId = `kit_${machineType.toLowerCase().replace(/\W+/g, '')}_${kitNumber}_${serviceNumber}`;
    nom = `Kit Entretien ${machineType} - ${kitNumber} - Service (${serviceNumber})`;

    res.json({
      kitsToImport: [{
        kitMetadata: { machineType, kitNumber, serviceNumber, kitId, nom },
        tasksData
      }]
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPARE PARTS
// ==========================================

app.get('/api/spare_parts', async (req, res) => {
  try {
    const parts = await prisma.sparePart.findMany();
    res.json({ list: parts, total: parts.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/spare_parts/:id', async (req, res) => {
  try {
    const part = await prisma.sparePart.findUnique({
      where: { id: req.params.id }
    });
    if (!part) {
      return res.status(404).json({ error: 'Pièce introuvable' });
    }
    res.json(part);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/spare_parts', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.id;
    
    // Assurer que les entiers et flottants sont corrects
    if (data.stock !== undefined) data.stock = Number(data.stock) || 0;
    if (data.seuilAlerte !== undefined) data.seuilAlerte = Number(data.seuilAlerte) || 0;
    if (data.prixUnitaire !== undefined) data.prixUnitaire = Number(data.prixUnitaire) || 0;
    
    const part = await prisma.sparePart.create({ data });
    res.json(part);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/spare_parts/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    
    if (data.stock !== undefined) data.stock = Number(data.stock) || 0;
    if (data.seuilAlerte !== undefined) data.seuilAlerte = Number(data.seuilAlerte) || 0;
    if (data.prixUnitaire !== undefined) data.prixUnitaire = Number(data.prixUnitaire) || 0;
    
    const part = await prisma.sparePart.update({
      where: { id: req.params.id },
      data
    });
    res.json(part);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/spare_parts/:id', async (req, res) => {
  try {
    await prisma.sparePart.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// ERROR CODES
// ==========================================

app.get('/api/error_codes', async (req, res) => {
  try {
    const codes = await prisma.errorCode.findMany();
    res.json({ list: codes, total: codes.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/error_codes', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.id;
    const code = await prisma.errorCode.create({ data });
    res.json(code);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/error_codes/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    const code = await prisma.errorCode.update({
      where: { id: req.params.id },
      data
    });
    res.json(code);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/error_codes/:id', async (req, res) => {
  try {
    await prisma.errorCode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// MACHINE FIELDS & OPTIONS
// ==========================================

app.get('/api/machine_fields', async (req, res) => {
  try {
    const fields = await prisma.machineField.findMany();
    res.json({ list: fields, total: fields.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/machine_fields/:id', async (req, res) => {
  try {
    const field = await prisma.machineField.findUnique({
      where: { id: req.params.id }
    });
    if (!field) return res.status(404).json({ error: 'Champ introuvable' });
    res.json(field);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/machine_fields', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.id;
    const field = await prisma.machineField.create({ data });
    res.json(field);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/machine_fields/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    const field = await prisma.machineField.update({
      where: { id: req.params.id },
      data
    });
    res.json(field);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/machine_fields/:id', async (req, res) => {
  try {
    await prisma.machineField.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/machine_field_options', async (req, res) => {
  try {
    const options = await prisma.machineFieldOption.findMany();
    res.json({ list: options, total: options.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/machine_field_options/:id', async (req, res) => {
  try {
    const option = await prisma.machineFieldOption.findUnique({
      where: { id: req.params.id }
    });
    if (!option) return res.status(404).json({ error: 'Option introuvable' });
    res.json(option);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/machine_field_options', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.id;
    const option = await prisma.machineFieldOption.create({ data });
    res.json(option);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/machine_field_options/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    const option = await prisma.machineFieldOption.update({
      where: { id: req.params.id },
      data
    });
    res.json(option);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/machine_field_options/:id', async (req, res) => {
  try {
    await prisma.machineFieldOption.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ==========================================
// DEMARRAGE SERVEUR
// ==========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur Backend démarré sur http://localhost:${PORT}`);
});
