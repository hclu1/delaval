const xlsx = require('xlsx');
const path = require('path');

const filePath = "D:\\Aplli\\Delaval\\Kit d'entretien\\archive Kit d'entretien\\V300 V310.xlsx";
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Service 1'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log('Row 0 (Headers?):', data[0]);
console.log('Row 1:', data[1]);
console.log('Row 2:', data[2]);
console.log('Row 3:', data[3]);
console.log('Row 4:', data[4]);
console.log('Row 5:', data[5]);
console.log('Total rows:', data.length);
