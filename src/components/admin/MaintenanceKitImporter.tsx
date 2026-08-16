import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, ArrowRight, ArrowLeft, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import * as XLSX from 'xlsx';
import { api } from '../../lib/api';

export interface KitMetadata {
  machineType: string;
  kitNumber: string;
  serviceNumber: number;
  kitId: string;
  nom: string;
}

export interface KitImportData {
  kitMetadata: KitMetadata;
  tasksData: any[];
}

interface MaintenanceKitImporterProps {
  onImport: (kitsToImport: KitImportData[]) => Promise<void>;
  onClose?: () => void;
}

export function MaintenanceKitImporter({ onImport, onClose }: MaintenanceKitImporterProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [kitsToImport, setKitsToImport] = useState<KitImportData[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setKitsToImport([]);
    setIsParsing(true);

    if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
      try {
        const result = await api.utils.parsePdf(selectedFile);
        if (result && result.kitsToImport && result.kitsToImport.length > 0) {
          setKitsToImport(result.kitsToImport);
          setStep(2);
        } else {
          setError("Aucun kit valide n'a pu être extrait du PDF.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsParsing(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const extractedKits: KitImportData[] = [];
        
        // Parcourir tous les onglets qui commencent par "Service"
        workbook.SheetNames.forEach(sheetName => {
          if (!sheetName.toLowerCase().startsWith('service')) return;
          
          const match = sheetName.match(/service\s*(\d+)/i);
          const serviceNumber = match ? parseInt(match[1]) : 1;
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          let machineType = 'Inconnu';
          let kitNumber = 'Inconnu';
          let tasksData: any[] = [];
          
          // Recherche des infos de base dans les 10 premières lignes
          for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row: any = jsonData[i];
            if (!row || row.length === 0) continue;
            
            for (let j = 0; j < row.length; j++) {
              if (typeof row[j] === 'string') {
                if (row[j].includes('Station de traite') || row[j].includes('VMS')) {
                  machineType = row[j].trim();
                }
                if (row[j].toUpperCase().includes('KIT N°')) {
                  const num = row[j].replace(/KIT\s*N°\s*/i, '').trim();
                  if (num) kitNumber = num;
                }
              }
            }
          }

          // Trouver la ligne d'en-tête pour les tâches
          let headerRowIndex = -1;
          for (let i = 0; i < jsonData.length; i++) {
            const row: any = jsonData[i];
            if (!row) continue;
            if (row.some((cell: any) => typeof cell === 'string' && cell.toLowerCase().includes('description des taches'))) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex !== -1) {
            const headers = jsonData[headerRowIndex] as string[];
            const colIndexes = {
              section: headers.findIndex(h => h && h.toLowerCase().includes('section')),
              description: headers.findIndex(h => h && h.toLowerCase().includes('description')),
              module: headers.findIndex(h => h && h.toLowerCase().includes('module')),
              etat: headers.findIndex(h => h && h.toLowerCase().includes('etat') || h && h.toLowerCase().includes('état')),
              refPiece: headers.findIndex(h => h && h.toLowerCase().includes('réf') || h && h.toLowerCase().includes('ref')),
              quantite: headers.findIndex(h => h && h.toLowerCase().includes('qté') || h && h.toLowerCase().includes('qte') || h && h.toLowerCase().includes('quantit')),
            };

            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              if (!row || row.length === 0) continue;
              
              const description = colIndexes.description >= 0 ? row[colIndexes.description] : null;
              if (!description) continue;
              
              const section = colIndexes.section >= 0 ? row[colIndexes.section] : '';
              
              // Skip "TOTAL" lines
              if (String(section).toUpperCase().includes('TOTAL') || String(description).toUpperCase().includes('TOTAL')) {
                continue;
              }

              let quantite = 0;
              if (colIndexes.quantite >= 0) {
                const qtyVal = row[colIndexes.quantite];
                if (typeof qtyVal === 'number') quantite = qtyVal;
                else if (typeof qtyVal === 'string') quantite = parseInt(qtyVal) || 0;
              }

              tasksData.push({
                section: section ? String(section).trim() : 'Général',
                description: String(description).trim(),
                module: colIndexes.module >= 0 && row[colIndexes.module] ? String(row[colIndexes.module]).trim() : '',
                etat: colIndexes.etat >= 0 && row[colIndexes.etat] ? String(row[colIndexes.etat]).trim() : 'todo',
                refPiece: colIndexes.refPiece >= 0 && row[colIndexes.refPiece] ? String(row[colIndexes.refPiece]).trim() : '',
                quantite,
                ordre: tasksData.length + 1
              });
            }
          }

          if (tasksData.length > 0) {
            const kitId = `kit_${machineType.toLowerCase().replace(/\W+/g, '')}_${kitNumber}_${serviceNumber}`;
            extractedKits.push({
              kitMetadata: {
                machineType,
                kitNumber,
                serviceNumber,
                kitId,
                nom: `Kit Entretien ${machineType} - ${kitNumber} - Service (${serviceNumber})`
              },
              tasksData
            });
          }
        });

        if (extractedKits.length === 0) {
          setError("Aucun kit valide n'a pu être extrait. Assurez-vous d'avoir des onglets 'Service X' avec la bonne structure.");
        } else {
          setKitsToImport(extractedKits);
          setStep(2);
        }
      } catch (err: any) {
        setError(`Erreur lors de la lecture du fichier : ${err.message}`);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onImport(kitsToImport);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Import Intelligent de Kits d'Entretien
        </h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle size={20} />
          </Button>
        )}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Déposez simplement votre fichier Excel (.xlsx) ou PDF. L'outil lira automatiquement le fichier, extraira les numéros de kit et les tâches d'entretien associées.
          </p>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors rounded-lg p-8 text-center relative">
            <input
              type="file"
              accept=".xlsx,.xls,.pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isParsing}
            />
            {isParsing ? (
              <div className="animate-pulse">
                <FileText className="mx-auto text-blue-500 mb-3" size={48} />
                <p className="text-base font-medium text-blue-900">Analyse en cours...</p>
              </div>
            ) : (
              <>
                <FileSpreadsheet className="mx-auto text-blue-500 mb-3" size={48} />
                <p className="text-base font-medium text-blue-900">
                  Cliquez ou glissez un fichier Excel ou PDF ici
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Fichiers .xlsx et .pdf supportés
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-green-50 text-green-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={24} className="text-green-600" />
              <h4 className="font-semibold text-lg">Analyse réussie !</h4>
            </div>
            <p>J'ai trouvé <strong>{kitsToImport.length} kit(s)</strong> dans ce fichier.</p>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {kitsToImport.map((k, index) => (
              <div key={index} className="bg-white border border-gray-200 p-3 rounded shadow-sm">
                <p className="font-medium text-gray-900">{k.kitMetadata.nom}</p>
                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                  <span>Onglet: Service {k.kitMetadata.serviceNumber}</span>
                  <span>Machine: {k.kitMetadata.machineType}</span>
                  <span>Numéro: {k.kitMetadata.kitNumber}</span>
                  <span className="font-bold text-blue-600">{k.tasksData.length} tâches</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setStep(1);
                setFile(null);
                setKitsToImport([]);
              }}
              className="flex items-center gap-2"
              disabled={isImporting}
            >
              <ArrowLeft size={20} />
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {isImporting ? 'Import en cours...' : `Importer les ${kitsToImport.length} kits`}
              {!isImporting && <ArrowRight size={20} />}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
