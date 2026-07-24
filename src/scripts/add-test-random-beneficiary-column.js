/**
 * One-off, idempotent script to add the `test_random_beneficiary` column to the
 * `users` table. Use this instead of `sequelize-cli db:migrate` on environments
 * whose schema was NOT created through sequelize migrations (SequelizeMeta is
 * empty), where a full `db:migrate` would try to re-run the entire history.
 *
 * Usage:  node src/scripts/add-test-random-beneficiary-column.js
 */
const { sequelize } = require('../models');

async function run() {
  const qi = sequelize.getQueryInterface();
  try {
    const table = await qi.describeTable('users');

    if (table.test_random_beneficiary) {
      console.log('✓ Column "test_random_beneficiary" already exists on users — nothing to do.');
      return;
    }

    await qi.addColumn('users', 'test_random_beneficiary', {
      type: sequelize.Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    console.log('✓ Added column "test_random_beneficiary" to users (default false).');
  } finally {
    await sequelize.close();
  }
}

run().catch((err) => {
  console.error('✗ Failed to add column:', err.message);
  process.exit(1);
});
