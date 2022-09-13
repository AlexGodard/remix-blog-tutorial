import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .finally(async () => {
    await prisma.$disconnect();
  });
