const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.errorCode.deleteMany();
  console.log("All error codes deleted.");
}

main().finally(() => prisma.$disconnect());
