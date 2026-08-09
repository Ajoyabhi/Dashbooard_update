'use strict';

/**
 * N-tier amount-range payout gateway routing (per merchant).
 *
 * Generalises the earlier single-threshold routing (payout_gateway_threshold +
 * payout_gateway_above/below) to an arbitrary number of amount ranges. The new
 * `payout_gateway_bands` column stores an ordered JSON array of bands:
 *
 *   [
 *     { "min": 0,     "max": 5000,  "gateway": "MizorPay" },
 *     { "min": 5000,  "max": 50000, "gateway": "BluSwap"  },
 *     { "min": 50000, "max": null,  "gateway": "DummyGateway" }
 *   ]
 *
 * A band matches when `amount >= min && (max === null || amount < max)` — i.e.
 * min is inclusive, max is exclusive, and a null max means "no upper bound".
 *
 * Resolution precedence in the payout controller:
 *   1. payout_gateway_bands (when it holds a valid, non-empty array)
 *   2. legacy payout_gateway_threshold + above/below (kept for back-compat)
 *   3. the single payout_merchant_name
 *
 * The legacy columns are intentionally left in place so already-configured
 * merchants keep routing without a data backfill.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('merchant_details', 'payout_gateway_bands', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Ordered JSON array of {min,max,gateway} amount bands; NULL/empty disables band routing (falls back to legacy threshold, then payout_merchant_name)'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('merchant_details', 'payout_gateway_bands');
  }
};
