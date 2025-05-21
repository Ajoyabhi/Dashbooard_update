'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns
    await queryInterface.addColumn('transaction_charges', 'gst_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    await queryInterface.addColumn('transaction_charges', 'platform_fee', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    // Update status enum to include new value
    await queryInterface.sequelize.query(`
      ALTER TABLE transaction_charges 
      MODIFY COLUMN status ENUM('pending', 'completed', 'failed', 'payin_qr_generated') 
      DEFAULT 'pending'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove new columns
    await queryInterface.removeColumn('transaction_charges', 'gst_amount');
    await queryInterface.removeColumn('transaction_charges', 'platform_fee');

    // Revert status enum
    await queryInterface.sequelize.query(`
      ALTER TABLE transaction_charges 
      MODIFY COLUMN status ENUM('pending', 'completed', 'failed') 
      DEFAULT 'pending'
    `);
  }
}; 