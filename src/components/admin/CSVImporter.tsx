import React, { useState } from 'react';
import Papa from 'papaparse';
import {Upload, CheckCircle, XCircle, AlertCircle} from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

interface CSVImporterProps {
  onImport: (data: any[], options: ImportOptions) => Promise<ImportResult>;
  columns: { key: string; label: string; required?: boolean }[];
  tableName: string;
}

interface ImportOptions {
  duplicateStrategy: 'ignore' | 'update' | 'reject';
}

interface ImportResult {
  success: number;
  errors: string[];
  duplicates: number;
}

export function CSVImporter({ onImport, columns, tableName }: CSVImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'ignore' | 'update' | 'reject'>('update');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFile = event.target.files?.[0];
  if (!selectedFile) return;

  setFile(selectedFile);
  setCsvData([]);
  setColumnMapping({});
  setImportResult(null);

  const reader = new FileReader();
  reader.onload = (e) => {
    let text = e.target?.result as string;
    if (!text) {
        alert("Fichier vide");
        return;
    }

    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (rawLines.length < 2) {
        alert("Fichier trop court.");
        return;
    }

    // 1. Extraire les en-têtes (qui peuvent être séparés par ; ou ,)
    const headerLine = rawLines[0];
    const headerSeparator = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(headerSeparator).map(h => h.replace(/^["']|["']$/g, '').trim());

    // 2. Parser chaque ligne de données de manière hyper robuste
    const parsedData: any[] = [];
    
    for (let i = 1; i < rawLines.length; i++) {
        let line = rawLines[i];
        
        // Retirer les points-virgules ou virgules parasites à la fin (générés par Excel)
        line = line.replace(/[;,]+$/, '');
        
        // Si Excel a englobé toute la ligne dans un guillemet géant : "Col1,""Col2"""
        if (line.startsWith('"') && line.endsWith('"') && line.includes('""')) {
            line = line.substring(1, line.length - 1);
            line = line.replace(/""/g, '"');
        }

        // On utilise PapaParse juste sur cette ligne "nettoyée" pour la découper correctement
        const parsed = Papa.parse(line, { header: false });
        if (parsed.data && parsed.data[0]) {
            const columns = parsed.data[0] as string[];
            
            // Construire l'objet correspondant aux en-têtes
            const rowObj: any = {};
            headers.forEach((h, index) => {
                rowObj[h] = columns[index] !== undefined ? columns[index].trim() : '';
            });
            
            parsedData.push(rowObj);
        }
    }

    setCsvData(parsedData);
    autoMapColumns(headers);
  };
  reader.readAsText(selectedFile, 'UTF-8');
};

// ✅ CORRECTION : Fonction avec vérifications de sécurité
const autoMapColumns = (headers: string[]) => {
    const newMapping: Record<string, string> = {};
    
    columns.forEach(col => {
        // ✅ SÉCURITÉ : Vérifier que col et col.label existent
        if (!col || !col.label) {
            console.warn('⚠️ Colonne sans label:', col);
            return;
        }
        
        // Cherche une correspondance insensible à la casse
        const match = headers.find(h => {
            if (!h) return false; // Sécurité pour headers vides
            const headerLower = h.toLowerCase();
            const labelLower = col.label.toLowerCase();
            const keyLower = col.key.toLowerCase();
            
            return headerLower === labelLower || 
                   headerLower.includes(keyLower) ||
                   labelLower.includes(headerLower);
        });
        
        if (match) {
            newMapping[col.key] = match;
            console.log(`✅ Mappage auto: ${col.key} → ${match}`);
        }
    });
    
    if (Object.keys(newMapping).length > 0) {
        setColumnMapping(newMapping);
        console.log('📋 Mappage automatique appliqué:', newMapping);
    } else {
        console.log('ℹ️ Aucun mappage automatique trouvé');
    }
};


const handleImport = async () => {
    // ✅ VÉRIFICATION SÉCURITÉ : Est-ce que l'utilisateur a mappé des colonnes ?
    if (Object.keys(columnMapping).length === 0) {
        alert("⚠️ Erreur : Vous n'avez fait correspondre aucune colonne.\n\nVeuillez utiliser la section 'Correspondance des colonnes' pour lier les colonnes de votre CSV aux champs de la base de données.");
        return;
    }

    // Vérification des champs obligatoires
    const missingRequired = columns.filter(col => col.required && !columnMapping[col.key]);
    if (missingRequired.length > 0) {
        alert(`⚠️ Il manque des champs obligatoires : ${missingRequired.map(c => c.label).join(', ')}`);
        return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
        // Transformation des données
        const mappedData = csvData.map(row => {
            const mapped: any = {};
            Object.entries(columnMapping).forEach(([targetCol, sourceCol]) => {
                // On prend la valeur du CSV (row[sourceCol]) et on la met dans l'objet cible (mapped[targetCol])
                // On gère le cas où la colonne source n'existe pas dans cette ligne (csv mal formé)
                mapped[targetCol] = row[sourceCol] || '';
            });
            return mapped;
        });

        // Filtrage des lignes vides
        // Une ligne est valide si elle a AU MOINS une valeur non vide après mappage
        const validData = mappedData.filter(row => {
            return Object.values(row).some(val => val && String(val).trim() !== '');
        });

        console.log('📊 Données mappées:', mappedData);
        console.log('✅ Données valides:', validData);

        if (validData.length === 0) {
            setImportResult({
                success: 0,
                errors: ['Aucune donnée valide trouvée dans le fichier après mappage. Vérifiez que les colonnes sélectionnées contiennent des données.'],
                duplicates: 0,
            });
            return;
        }

        const result = await onImport(validData, { duplicateStrategy });
        setImportResult(result);
    } catch (error) {
        console.error('Erreur import:', error);
        setImportResult({
            success: 0,
            errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
            duplicates: 0,
        });
    } finally {
        setIsImporting(false);
    }
};
  const isValidMapping = columns.every(col => 
    !col.required || columnMapping[col.key]
  );

  return (
    <Card className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Import CSV - {tableName}
        </h3>

        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <Upload className="mx-auto text-gray-400 mb-2" size={48} />
            <p className="text-sm text-gray-600">
              {file ? file.name : 'Cliquez pour sélectionner un fichier CSV'}
            </p>
          </label>
        </div>
      </div>

{/* Column Mapping */}
{csvData.length > 0 && (
  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
    <h4 className="font-bold text-blue-900 mb-3">📋 Correspondance des colonnes</h4>
    <p className="text-sm text-blue-700 mb-4">
      Reliez les colonnes de votre fichier CSV (à gauche) aux champs de l'application (à droite).
    </p>
    
    {Object.keys(columnMapping).length === 0 && (
        <div className="bg-yellow-100 text-yellow-800 text-sm p-2 rounded mb-3">
            ℹ️ J'ai essayé de deviner automatiquement, mais vérifiez ci-dessous.
        </div>
    )}

    <div className="space-y-3">
      {columns.map((col, index) => (
        <div key={`${col.key}-${index}`} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="sm:w-1/3 text-sm font-medium text-gray-800">
            {col.label} {col.required && <span className="text-red-500 font-bold">*</span>}
          </label>
          <select
            value={columnMapping[col.key] || ''}
            onChange={(e) => setColumnMapping({ ...columnMapping, [col.key]: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Sélectionner une colonne CSV --</option>
            {Object.keys(csvData[0] || {}).map((header, headerIndex) => (
              <option key={`${header}-${headerIndex}`} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  </div>
)}



      {/* Duplicate Strategy */}
      {csvData.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Gestion des doublons</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="dup-strat"
                value="ignore"
                checked={duplicateStrategy === 'ignore'}
                onChange={(e) => setDuplicateStrategy(e.target.value as any)}
              />
              <span className="text-sm text-gray-700">Ignorer les doublons</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="dup-strat"
                value="update"
                checked={duplicateStrategy === 'update'}
                onChange={(e) => setDuplicateStrategy(e.target.value as any)}
              />
              <span className="text-sm text-gray-700">Mettre à jour les doublons</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="dup-strat"
                value="reject"
                checked={duplicateStrategy === 'reject'}
                onChange={(e) => setDuplicateStrategy(e.target.value as any)}
              />
              <span className="text-sm text-gray-700">Refuser tout si doublon</span>
            </label>
          </div>
        </div>
      )}

      {/* Import Button */}
      {csvData.length > 0 && (
        <Button
          onClick={handleImport}
          disabled={!isValidMapping || isImporting}
          className="w-full"
        >
          {isImporting ? 'Import en cours...' : `Importer ${csvData.length} lignes`}
        </Button>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={20} />
            <span className="font-medium">{importResult.success} lignes importées avec succès</span>
          </div>
          {importResult.duplicates > 0 && (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle size={20} />
              <span>{importResult.duplicates} doublons détectés</span>
            </div>
          )}
          {importResult.errors.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle size={20} />
                <span className="font-medium">{importResult.errors.length} erreurs</span>
              </div>
              <div className="pl-7 text-sm text-red-600 max-h-40 overflow-y-auto bg-red-50 p-2 rounded">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="border-b border-red-100 pb-1 mb-1 last:border-0">• {error}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}