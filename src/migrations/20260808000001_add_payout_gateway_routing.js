'use strict';

/**
 * Amount-based payout gateway routing (per merchant).
 *
 * When `payout_gateway_threshold` is set AND both above/below gateways are set,
 * the payout controller routes by amount:
 *   amount >= threshold  -> payout_gateway_above
 *   amount <  threshold  -> payout_gateway_below
 * When the threshold is NULL, routing is disabled and the merchant's single
 * `payout_merchant_name` is used as before (fully backward-compatible).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('merchant_details', 'payout_gateway_threshold', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Amount cutoff for gateway routing; NULL disables routing (uses payout_merchant_name)'
    });
    await queryInterface.addColumn('merchant_details', 'payout_gateway_above', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: 'Gateway used when amount >= payout_gateway_threshold'
    });
    await queryInterface.addColumn('merchant_details', 'payout_gateway_below', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: 'Gateway used when amount < payout_gateway_threshold'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('merchant_details', 'payout_gateway_below');
    await queryInterface.removeColumn('merchant_details', 'payout_gateway_above');
    await queryInterface.removeColumn('merchant_details', 'payout_gateway_threshold');
  }
};
