const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');

const prisma = new PrismaClient();

async function importFields() {
  const fieldsPath = 'D:\\Aplli\\Delaval\\Soplan\\Base de donné csv\\Champs machines et option de champs\\machine_fields.csv';
  const csvData = fs.readFileSync(fieldsPath, 'utf-8');
  
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  
  console.log(`Importing ${parsed.data.length} MachineFields...`);
  
  for (const row of parsed.data) {
    if (!row.machineType || !row.label) continue;
    
    await prisma.machineField.create({
      data: {
        machineType: row.machineType,
        label: row.label,
        fieldType: row.fieldType,
        isRequired: row.isRequired === 'true',
        isActive: row.isActive === 'true',
        order: parseInt(row.order) || 0,
        parentField: row.conditionalRules_parentField || null,
        parentValue: row.conditionalRules_parentValue || null,
        allowCustomValue: row.allowCustomValue === 'true',
        creator: row.creator || null,
        creatorEmail: row.creatorEmail || null,
      }
    });
  }
}

async function importOptions() {
  const optionsPath = 'D:\\Aplli\\Delaval\\Soplan\\Base de donné csv\\Champs machines et option de champs\\machine_field_options.csv';
  const csvData = fs.readFileSync(optionsPath, 'utf-8');
  
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  
  console.log(`Importing ${parsed.data.length} MachineFieldOptions...`);
  
  for (const row of parsed.data) {
    if (!row.fieldLabel || !row.value) continue;
    
    await prisma.machineFieldOption.create({
      data: {
        fieldLabel: row.fieldLabel,
        value: row.value,
        order: parseInt(row.order) || 0,
        creator: row.creator || null,
        creatorEmail: row.creatorEmail || null,
      }
    });
  }
}

async function main() {
  await importFields();
  await importOptions();
  console.log('Import completed!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
