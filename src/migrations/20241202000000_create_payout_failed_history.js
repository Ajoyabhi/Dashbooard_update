'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payout_failed_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
      reference_id: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      transaction_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      transaction_type: {
        type: Sequelize.ENUM('UserTransaction', 'PayoutTransaction'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      charges: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      total_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      wallet_balance_before: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      wallet_balance_after: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      beneficiary_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      beneficiary_account: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      beneficiary_ifsc: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      bank_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      utr_number: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      remark: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      failed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      original_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
      },
      new_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'failed'
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
    await queryInterface.addIndex('payout_failed_history', ['user_id']);
    await queryInterface.addIndex('payout_failed_history', ['reference_id']);
    await queryInterface.addIndex('payout_failed_history', ['transaction_id']);
    await queryInterface.addIndex('payout_failed_history', ['failed_by']);
    await queryInterface.addIndex('payout_failed_history', ['created_at']);
    await queryInterface.addIndex('payout_failed_history', ['transaction_type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payout_failed_history');
  }
}; 