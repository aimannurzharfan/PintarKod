const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'teacher@example.com';
  const username = 'teacher1';
  const plainPassword = 'Teacher123!'; // change if desired

  const hashed = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: 'Teacher',
      username,
    },
    create: {
      username,
      email,
      password: hashed,
      role: 'Teacher'
    },
  });

  console.log('Teacher account created/updated:', user.email);
  console.log('Login with:', user.email, 'password:', plainPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
