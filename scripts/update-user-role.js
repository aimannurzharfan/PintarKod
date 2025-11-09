const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    const userId = 7;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.error(`❌ User with ID ${userId} not found`);
      process.exit(1);
    }

    console.log(`Current user details:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Current Role: ${user.role}`);
    console.log('\nUpdating role to Teacher...');

    // Update user role to Teacher
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: 'Teacher' }
    });

    console.log('\n✅ User role updated successfully!');
    console.log('\nUpdated user details:');
    console.log(`  ID: ${updatedUser.id}`);
    console.log(`  Username: ${updatedUser.username}`);
    console.log(`  Email: ${updatedUser.email}`);
    console.log(`  Role: ${updatedUser.role}`);
  } catch (error) {
    console.error('❌ Error updating user role:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();

