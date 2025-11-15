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

  // Seed debugging challenges
  await prisma.debuggingChallenge.deleteMany({});

  await prisma.debuggingChallenge.create({
    data: {
      title_en: 'The Infinite Loop',
      title_ms: 'Gelung Tidak Berpenghujung',
      description_en: 'Find the line that causes this loop to run forever.',
      description_ms: 'Cari baris kod yang menyebabkan gelung ini berjalan selama-lamanya.',
      codeBlock: 'function countToFive() {\n  for (let i = 0; i < 5; i--) {\n    console.log(i);\n  }\n}',
      buggyLineIndex: 1,
      explanation_en: 'The loop was using `i--` (decrement) instead of `i++` (increment).',
      explanation_ms: 'Gelung ini sepatutnya menggunakan `i++`, bukan `i--`.',
      basePoints: 1000,
    },
  });

  await prisma.debuggingChallenge.create({
    data: {
      title_en: 'Missing Return Statement',
      title_ms: 'Pernyataan Pulangan Yang Hilang',
      description_en: 'Find the function that is missing a return statement.',
      description_ms: 'Cari fungsi yang hilang pernyataan pulangan.',
      codeBlock: 'function add(a, b) {\n  const sum = a + b;\n}\n\nconsole.log(add(2, 3));',
      buggyLineIndex: 0,
      explanation_en: 'The function calculates the sum but does not return it. It should return `sum`.',
      explanation_ms: 'Fungsi mengira jumlah tetapi tidak memulangkannya. Ia sepatutnya memulangkan `sum`.',
      basePoints: 1000,
    },
  });

  await prisma.debuggingChallenge.create({
    data: {
      title_en: 'Wrong Comparison Operator',
      title_ms: 'Operator Perbandingan Yang Salah',
      description_en: 'Find the line with the wrong comparison operator.',
      description_ms: 'Cari baris dengan operator perbandingan yang salah.',
      codeBlock: 'function checkAge(age) {\n  if (age = 18) {\n    return "Adult";\n  }\n  return "Minor";\n}',
      buggyLineIndex: 1,
      explanation_en: 'Line 1 uses assignment (`=`) instead of comparison (`===` or `==`).',
      explanation_ms: 'Baris 1 menggunakan penugasan (`=`) bukan perbandingan (`===` atau `==`).',
      basePoints: 1000,
    },
  });

  console.log('Created debugging challenges');
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
