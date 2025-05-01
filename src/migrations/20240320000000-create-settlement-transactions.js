'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('settlement_transactions', {
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
        onDelete: 'RESTRICT'
      },
      amount: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: false
      },
      wallet_balance_before: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: false
      },
      wallet_balance_after: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: false
      },
      settlement_balance_before: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: false
      },
      settlement_balance_after: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('completed', 'failed'),
        defaultValue: 'completed'
      },
      remark: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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

    // Add indexes
    await queryInterface.addIndex('settlement_transactions', ['user_id']);
    await queryInterface.addIndex('settlement_transactions', ['created_by']);
    await queryInterface.addIndex('settlement_transactions', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('settlement_transactions');
  }
}; 