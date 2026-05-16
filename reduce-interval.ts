import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.keeperSettings.update({
    where: { id: 'default' },
    data: {
      checkIntervalSeconds: 600, // 10 minutes
    },
  });
  console.log('Set checkIntervalSeconds to 600s.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
