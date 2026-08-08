'use strict';

/**
 * Dummy/test payout UTR prefix.
 *
 * When a merchant's payout gateway is set to 'DummyGateway', the simulated
 * settlement callback returns a synthetic UTR. This column lets an admin fix the
 * leading digits of that UTR per merchant (e.g. '6220133'); the dummy pipeline
 * fills the remaining digits randomly up to the configured total length (default
 * 10). NULL/empty => the whole UTR is random.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('merchant_details', 'dummy_utr_prefix', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null,
      comment: 'Leading digits for the synthetic UTR on DummyGateway payouts; rest is random up to the total UTR length'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('merchant_details', 'dummy_utr_prefix');
  }
};
