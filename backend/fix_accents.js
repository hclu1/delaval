const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const replacements = [
  { from: /‚/g, to: 'é' },
  { from: /ƒ/g, to: 'â' },
  { from: /ˆ/g, to: 'ê' },
  { from: /‡/g, to: 'ç' },
  { from: /…/g, to: 'à' },
  { from: /“/g, to: 'ô' },
  { from: /Š/g, to: 'è' }
];

function fixText(text) {
  if (!text) return text;
  let fixed = text;
  for (const { from, to } of replacements) {
    fixed = fixed.replace(from, to);
  }
  return fixed;
}

async function main() {
  const codes = await prisma.errorCode.findMany();
  let updatedCount = 0;

  for (const code of codes) {
    let needsUpdate = false;
    const updateData = {};

    for (const field of ['chapitre', 'titre', 'alarme', 'typeAlarme', 'cause', 'action']) {
      if (code[field]) {
        const fixed = fixText(code[field]);
        if (fixed !== code[field]) {
          updateData[field] = fixed;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await prisma.errorCode.update({
        where: { id: code.id },
        data: updateData
      });
      updatedCount++;
    }
  }

  console.log(`Corrigé ${updatedCount} codes d'erreur.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
