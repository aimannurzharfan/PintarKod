const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Teacher account
  const teacherEmail = 'teacher@pintarkod.com';
  const teacherUsername = 'teacher';
  const teacherPassword = 'teacher123';
  const teacherHashed = await bcrypt.hash(teacherPassword, 10);

  const teacher = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: {
      password: teacherHashed,
      role: 'Teacher',
      username: teacherUsername,
    },
    create: {
      username: teacherUsername,
      email: teacherEmail,
      password: teacherHashed,
      role: 'Teacher'
    },
  });

  console.log('Teacher account:', teacher.email, '| Password:', teacherPassword);

  // Student 1
  const student1Email = 'student1@pintarkod.com';
  const student1Username = 'student1';
  const student1Password = 'student1123';
  const student1Hashed = await bcrypt.hash(student1Password, 10);

  const student1 = await prisma.user.upsert({
    where: { email: student1Email },
    update: {
      password: student1Hashed,
      role: 'Student',
      username: student1Username,
    },
    create: {
      username: student1Username,
      email: student1Email,
      password: student1Hashed,
      role: 'Student'
    },
  });

  console.log('Student 1 account:', student1.email, '| Password:', student1Password);

  // Student 2
  const student2Email = 'student2@pintarkod.com';
  const student2Username = 'student2';
  const student2Password = 'student2123';
  const student2Hashed = await bcrypt.hash(student2Password, 10);

  const student2 = await prisma.user.upsert({
    where: { email: student2Email },
    update: {
      password: student2Hashed,
      role: 'Student',
      username: student2Username,
    },
    create: {
      username: student2Username,
      email: student2Email,
      password: student2Hashed,
      role: 'Student'
    },
  });

  console.log('Student 2 account:', student2.email, '| Password:', student2Password);

  // Student 3
  const student3Email = 'student3@pintarkod.com';
  const student3Username = 'student3';
  const student3Password = 'student3123';
  const student3Hashed = await bcrypt.hash(student3Password, 10);

  const student3 = await prisma.user.upsert({
    where: { email: student3Email },
    update: {
      password: student3Hashed,
      role: 'Student',
      username: student3Username,
    },
    create: {
      username: student3Username,
      email: student3Email,
      password: student3Hashed,
      role: 'Student'
    },
  });

  console.log('Student 3 account:', student3.email, '| Password:', student3Password);

  // Student 4
  const student4Email = 'student4@pintarkod.com';
  const student4Username = 'student4';
  const student4Password = 'student4123';
  const student4Hashed = await bcrypt.hash(student4Password, 10);

  const student4 = await prisma.user.upsert({
    where: { email: student4Email },
    update: {
      password: student4Hashed,
      role: 'Student',
      username: student4Username,
    },
    create: {
      username: student4Username,
      email: student4Email,
      password: student4Hashed,
      role: 'Student'
    },
  });

  console.log('Student 4 account:', student4.email, '| Password:', student4Password);
  console.log('\n✅ All accounts created/updated successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
