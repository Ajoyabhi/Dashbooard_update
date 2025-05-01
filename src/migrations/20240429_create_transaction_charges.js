'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transaction_charges', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      transaction_type: {
        type: Sequelize.ENUM('payin', 'payout'),
        allowNull: false
      },
      reference_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      transaction_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      transaction_utr: {
        type: Sequelize.STRING,
        allowNull: true
      },
      merchant_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      agent_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      total_charges: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('transaction_charges', ['reference_id']);
    await queryInterface.addIndex('transaction_charges', ['user_id']);
    await queryInterface.addIndex('transaction_charges', ['transaction_type']);
    await queryInterface.addIndex('transaction_charges', ['status']);
    await queryInterface.addIndex('transaction_charges', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('transaction_charges');
  }
}; 