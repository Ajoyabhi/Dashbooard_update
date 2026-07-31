'use strict';

/**
 * Direct Bank Payout wallet.
 *
 * Adds a new balance bucket on financial_details so that when an admin processes
 * a settlement they can route the funds either to the merchant's Settlement wallet
 * (existing behaviour) or to a separate "Direct Bank Payout" wallet — money that
 * will be paid out to the merchant's bank directly, tracked apart from settlement.
 *
 * Also extends settlement_transactions to record which destination each processed
 * settlement went to, plus the before/after of the direct-bank bucket for audit.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('financial_details', 'direct_bank_payout', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn('settlement_transactions', 'destination', {
      type: Sequelize.ENUM('settlement', 'direct_bank'),
      allowNull: false,
      defaultValue: 'settlement'
    });

    await queryInterface.addColumn('settlement_transactions', 'direct_bank_balance_before', {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true
    });

    await queryInterface.addColumn('settlement_transactions', 'direct_bank_balance_after', {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('settlement_transactions', 'direct_bank_balance_after');
    await queryInterface.removeColumn('settlement_transactions', 'direct_bank_balance_before');
    await queryInterface.removeColumn('settlement_transactions', 'destination');
    // Drop the ENUM type MySQL created for the `destination` column.
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_settlement_transactions_destination";');
    }
    await queryInterface.removeColumn('financial_details', 'direct_bank_payout');
  }
};
