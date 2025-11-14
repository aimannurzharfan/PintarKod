// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');
  
  const hashedPassword = await bcryptjs.hash('teacher123', 10);

  // Create the master Teacher account
  const teacher = await prisma.user.create({
    data: {
      username: 'teacher',
      email: 'teacher@pintarkod.com',
      password: hashedPassword,
      role: 'Teacher',
    },
  });

  console.log(`Created teacher account: ${teacher.username}`);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
