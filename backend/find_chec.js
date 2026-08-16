const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const data = await prisma.errorCode.findMany({ where: { titre: { contains: 'chec' } } });
  for (const item of data) {
    console.log(item.titre);
    const index = item.titre.indexOf('chec');
    if (index !== -1) {
      console.log('Chars before chec:');
      for (let i = Math.max(0, index - 5); i <= index; i++) {
        console.log(`Char [${item.titre[i]}]: ${item.titre.charCodeAt(i).toString(16)}`);
      }
    }
  }
}
main().finally(() => prisma.$disconnect());
