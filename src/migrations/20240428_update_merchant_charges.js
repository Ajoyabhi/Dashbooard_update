'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First rename existing columns
    await queryInterface.renameColumn('merchant_charges', 'payin_charge', 'admin_payin_charge');
    await queryInterface.renameColumn('merchant_charges', 'payout_charge', 'admin_payout_charge');
    await queryInterface.renameColumn('merchant_charges', 'payin_charge_type', 'admin_payin_charge_type');
    await queryInterface.renameColumn('merchant_charges', 'payout_charge_type', 'admin_payout_charge_type');

    // Add new columns
    await queryInterface.addColumn('merchant_charges', 'agent_payin_charge_type', {
      type: Sequelize.ENUM('percentage', 'fixed'),
      allowNull: false,
      defaultValue: 'percentage'
    });

    await queryInterface.addColumn('merchant_charges', 'agent_payout_charge_type', {
      type: Sequelize.ENUM('percentage', 'fixed'),
      allowNull: false,
      defaultValue: 'percentage'
    });

    // Remove old columns
    await queryInterface.removeColumn('merchant_charges', 'payin_total_charge');
    await queryInterface.removeColumn('merchant_charges', 'payout_total_charge');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the changes
    await queryInterface.renameColumn('merchant_charges', 'admin_payin_charge', 'payin_charge');
    await queryInterface.renameColumn('merchant_charges', 'admin_payout_charge', 'payout_charge');
    await queryInterface.renameColumn('merchant_charges', 'admin_payin_charge_type', 'payin_charge_type');
    await queryInterface.renameColumn('merchant_charges', 'admin_payout_charge_type', 'payout_charge_type');

    await queryInterface.removeColumn('merchant_charges', 'agent_payin_charge_type');
    await queryInterface.removeColumn('merchant_charges', 'agent_payout_charge_type');

    await queryInterface.addColumn('merchant_charges', 'payin_total_charge', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn('merchant_charges', 'payout_total_charge', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });
  }
}; 