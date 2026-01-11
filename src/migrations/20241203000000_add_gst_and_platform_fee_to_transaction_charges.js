'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add gst_amount column
    await queryInterface.addColumn('transaction_charges', 'gst_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    // Add platform_fee column
    await queryInterface.addColumn('transaction_charges', 'platform_fee', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });

    // Update status ENUM to include 'payin_qr_generated'
    // MySQL requires modifying ENUM using ALTER TABLE with MODIFY COLUMN
    await queryInterface.sequelize.query(
      "ALTER TABLE `transaction_charges` MODIFY COLUMN `status` ENUM('pending', 'completed', 'failed', 'payin_qr_generated') NOT NULL DEFAULT 'pending'"
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Revert status ENUM back to original values
    await queryInterface.sequelize.query(
      "ALTER TABLE `transaction_charges` MODIFY COLUMN `status` ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending'"
    );

    // Remove the columns
    await queryInterface.removeColumn('transaction_charges', 'gst_amount');
    await queryInterface.removeColumn('transaction_charges', 'platform_fee');
  }
};

