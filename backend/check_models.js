const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const machines = await prisma.machine.findMany({ select: { nom: true, typeMachineNom: true, machineType: true } });
  console.log('MACHINES:', machines);
}
main().finally(() => prisma.$disconnect());
