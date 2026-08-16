const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const codes = await prisma.errorCode.findMany();
  let updatedCount = 0;

  for (const code of codes) {
    let needsUpdate = false;
    const updateData = {};

    for (const field of ['chapitre', 'titre', 'alarme', 'typeAlarme', 'cause', 'action']) {
      if (code[field]) {
        let fixed = code[field];
        
        // Remplacer le caractère de contrôle \u0090 par É
        fixed = fixed.replace(/\x90/g, 'É');
        
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

  console.log(`Corrigé ${updatedCount} codes d'erreur contenant É (\\x90).`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
