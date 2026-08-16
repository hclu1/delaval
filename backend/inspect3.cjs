const xlsx = require('xlsx');
const filePath = "D:\\Aplli\\Delaval\\Kit d'entretien\\archive Kit d'entretien\\V300 V310.xlsx";
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Service 1'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
for(let i=5; i<25; i++) {
  console.log(`Row ${i}:`, data[i]);
}
