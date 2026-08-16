const fs = require('fs');
const path = require('path');

function searchFiles(dir, term, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
        results = results.concat(searchFiles(filePath, term, ext));
      }
    } else {
      if (file.endsWith(ext)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(term)) {
          results.push(filePath);
        }
      }
    }
  });
  return results;
}

const frontendRes = searchFiles('d:\\Aplli\\Delaval\\test\\src', 'maintenance_kits', '.ts');
const frontendRes2 = searchFiles('d:\\Aplli\\Delaval\\test\\src', 'maintenance_kits', '.tsx');
const backendRes = searchFiles('d:\\Aplli\\Delaval\\test\\backend', 'maintenance_kits', '.ts');
console.log('Frontend TS:', frontendRes);
console.log('Frontend TSX:', frontendRes2);
console.log('Backend:', backendRes);
