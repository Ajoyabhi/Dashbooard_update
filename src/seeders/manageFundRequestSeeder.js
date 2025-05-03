const { sequelize } = require('../config/database');
const ManageFundRequest = require('../models/manageFundRequest.model')(sequelize);
const manageFundRequestSeed = require('../data/manageFundRequestSeed');

async function seedManageFundRequests() {
  try {
    // Sync the model with the database
    await sequelize.sync();

    // Check if data already exists
    const existingCount = await ManageFundRequest.count();
    if (existingCount > 0) {
      console.log('ManageFundRequest data already exists. Skipping seed...');
      return;
    }

    // Insert the seed data
    await ManageFundRequest.bulkCreate(manageFundRequestSeed);
    console.log('✅ ManageFundRequest seed data inserted successfully');
  } catch (error) {
    console.error('❌ Error seeding ManageFundRequest data:', error);
  }
}

// If this file is run directly
if (require.main === module) {
  seedManageFundRequests()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedManageFundRequests; 