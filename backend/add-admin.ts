import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const technicien = await prisma.technicien.upsert({
      where: { email: 'champagcrypt@gmail.com' },
      update: { roles: 'ADMINISTRATEUR' },
      create: {
        nom: 'Administrateur',
        prenom: 'Système',
        email: 'champagcrypt@gmail.com',
        roles: 'ADMINISTRATEUR',
      },
    });
    console.log('Utilisateur admin configuré:', technicien.email);
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
