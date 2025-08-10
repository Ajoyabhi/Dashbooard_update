'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('wallet_transactions', {
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
      transaction_type: {
        type: Sequelize.ENUM('credit', 'debit'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      balance_before: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      balance_after: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      remark: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('wallet_transactions', ['user_id']);
    await queryInterface.addIndex('wallet_transactions', ['transaction_type']);
    await queryInterface.addIndex('wallet_transactions', ['created_at']);
    await queryInterface.addIndex('wallet_transactions', ['created_by']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('wallet_transactions');
  }
}; 