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

  // Create or get a seeded Student account (student5)
  const existingStudent5 = await prisma.user.findUnique({
    where: { email: 'student5@student.pintarkod' },
  });

  if (!existingStudent5) {
    const hashedPassword = await bcryptjs.hash('student123', 10);
    const student5 = await prisma.user.create({
      data: {
        username: 'student5',
        email: 'student5@student.pintarkod',
        password: hashedPassword,
        role: 'Student',
      },
    });
    console.log(`Created student account: ${student5.username}`);
  } else {
    console.log(`Student account already exists: ${existingStudent5.username}`);
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
