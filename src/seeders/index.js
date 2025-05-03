const seedManageFundRequests = require('./manageFundRequestSeeder');

async function runAllSeeders() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Run all seeders
    await seedManageFundRequests();
    
    console.log('✅ All seeders completed successfully');
  } catch (error) {
    console.error('❌ Error running seeders:', error);
    process.exit(1);
  }
}

// If this file is run directly
if (require.main === module) {
  runAllSeeders()
    .then(() => {
      console.log('Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = runAllSeeders; 