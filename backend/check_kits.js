const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kits = await prisma.maintenanceKit.findMany({ select: { nom: true, machineType: true, actif: true } });
  console.log('KITS:', kits);
}
main().finally(() => prisma.$disconnect());
