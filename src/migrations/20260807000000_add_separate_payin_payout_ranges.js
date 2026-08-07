'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Separate amount ranges for payin vs payout. Previously a single
    // start_amount/end_amount bracket applied to both sides. These columns let
    // an admin configure independent payin and payout amount ranges.
    //
    // They are nullable: existing rows keep NULL here and the app falls back to
    // the legacy start_amount/end_amount, so nothing breaks until an admin sets
    // per-side ranges. We still backfill them below so the dashboard shows the
    // current ranges instead of blanks.
    await queryInterface.addColumn('merchant_charges', 'payin_start_amount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Payin amount range start; NULL falls back to start_amount'
    });
    await queryInterface.addColumn('merchant_charges', 'payin_end_amount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Payin amount range end; NULL falls back to end_amount'
    });
    await queryInterface.addColumn('merchant_charges', 'payout_start_amount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Payout amount range start; NULL falls back to start_amount'
    });
    await queryInterface.addColumn('merchant_charges', 'payout_end_amount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Payout amount range end; NULL falls back to end_amount'
    });

    // Backfill existing brackets: both sides inherit the old shared range.
    await queryInterface.sequelize.query(`
      UPDATE merchant_charges
      SET payin_start_amount  = start_amount,
          payin_end_amount    = end_amount,
          payout_start_amount = start_amount,
          payout_end_amount   = end_amount
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('merchant_charges', 'payin_start_amount');
    await queryInterface.removeColumn('merchant_charges', 'payin_end_amount');
    await queryInterface.removeColumn('merchant_charges', 'payout_start_amount');
    await queryInterface.removeColumn('merchant_charges', 'payout_end_amount');
  }
};
