const xlsx = require('xlsx');
const path = require('path');

const filePath = "D:\\Aplli\\Delaval\\Kit d'entretien\\archive Kit d'entretien\\V300 V310.xlsx";
console.log('Reading file:', filePath);

try {
  const workbook = xlsx.readFile(filePath);
  console.log('Sheets:', workbook.SheetNames);
  
  if (workbook.SheetNames.includes('service 1')) {
    const sheet = workbook.Sheets['service 1'];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log('Headers:', data[0]);
    console.log('Row 1:', data[1]);
    console.log('Row 2:', data[2]);
    console.log('Total rows:', data.length);
  } else {
    console.log('Sheet "service 1" not found!');
  }
} catch (e) {
  console.error('Error reading excel file:', e.message);
}
