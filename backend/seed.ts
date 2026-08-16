import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.upsert({
    where: { numeroClient: '12345' },
    update: {},
    create: {
      nom: 'Ferme Test',
      numeroClient: '12345',
      adresse: '123 Rue de la Ferme',
      ville: 'Campagne',
      machines: {
        create: [
          { nom: 'Robot A', serie: 'RA-001', typeMachineNom: 'Robot de traite', relationType: 'MAITRE' }
        ]
      }
    }
  });

  console.log('Client de test créé :', client);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
