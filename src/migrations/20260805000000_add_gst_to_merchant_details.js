'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Per-user GST override. NULL means "use the global PlatformCharges.gst",
    // so existing merchants keep the current global GST until an admin sets a
    // user-specific value.
    await queryInterface.addColumn('merchant_details', 'gst', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Per-user GST percentage; NULL falls back to global PlatformCharges.gst'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('merchant_details', 'gst');
  }
};
