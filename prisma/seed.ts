// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');
  
  // Create or get the master Teacher account
  const existingTeacher = await prisma.user.findUnique({
    where: { email: 'teacher@pintarkod.com' },
  });

  if (!existingTeacher) {
    const hashedPassword = await bcryptjs.hash('teacher123', 10);
    const teacher = await prisma.user.create({
      data: {
        username: 'teacher',
        email: 'teacher@pintarkod.com',
        password: hashedPassword,
        role: 'Teacher',
      },
    });
    console.log(`Created teacher account: ${teacher.username}`);
  } else {
    console.log(`Teacher account already exists: ${existingTeacher.username}`);
  }

  // Debugging challenges are now dynamically generated, no need to seed
  console.log('Note: Debugging challenges are now dynamically generated');
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
