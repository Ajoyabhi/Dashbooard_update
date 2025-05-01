'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      user_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      mobile: {
        type: Sequelize.STRING(15)
      },
      email: {
        type: Sequelize.STRING(100),
        unique: true
      },
      company_name: {
        type: Sequelize.STRING(100)
      },
      aadhaar_card: {
        type: Sequelize.STRING(12)
      },
      pancard: {
        type: Sequelize.STRING(10)
      },
      address: {
        type: Sequelize.TEXT
      },
      city: {
        type: Sequelize.STRING(50)
      },
      state: {
        type: Sequelize.STRING(50)
      },
      pincode: {
        type: Sequelize.STRING(10)
      },
      gst_no: {
        type: Sequelize.STRING(15)
      },
      business_type: {
        type: Sequelize.ENUM('pvtltd', 'partnership', 'proprietorship', 'llp', 'public')
      },
      user_type: {
        type: Sequelize.ENUM('admin', 'payin_payout', 'staff', 'agent', 'payout_only'),
        allowNull: false
      },
      agent_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      pin: {
        type: Sequelize.STRING(6)
      },
      remember_token: {
        type: Sequelize.STRING(100)
      },
      created_by: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      updated_by: {
        type: Sequelize.INTEGER,
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

    // Create merchant_details table
    await queryInterface.createTable('merchant_details', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      payin_merchant_assigned: {
        type: Sequelize.STRING(50)
      },
      payin_merchant_name: {
        type: Sequelize.STRING(100)
      },
      payout_merchant_assigned: {
        type: Sequelize.STRING(50)
      },
      payout_merchant_name: {
        type: Sequelize.STRING(100)
      },
      user_key: {
        type: Sequelize.STRING(100)
      },
      user_token: {
        type: Sequelize.STRING(255)
      },
      payin_callback: {
        type: Sequelize.STRING(255)
      },
      payout_callback: {
        type: Sequelize.STRING(255)
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

    // Create financial_details table
    await queryInterface.createTable('financial_details', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      settlement: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      wallet: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      lien: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      rolling_reserve: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
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

    // Create user_status table
    await queryInterface.createTable('user_status', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      payout_status: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      api_status: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      payin_status: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      payouts_status: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      tecnical_issue: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      vouch: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      iserveu: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      bank_deactive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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

    // Create merchant_charges table
    await queryInterface.createTable('merchant_charges', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      start_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      end_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      payout_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      payin_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      agent_payin_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      agent_payout_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      payin_total_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      payout_total_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      payin_charge_type: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false
      },
      payout_charge_type: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false
      },
      created_by: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      updated_by: {
        type: Sequelize.INTEGER,
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

    // Create merchant_mode_charges table
    await queryInterface.createTable('merchant_mode_charges', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      charge_type: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false
      },
      mode: {
        type: Sequelize.ENUM('payin', 'payout'),
        allowNull: false
      },
      start_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      end_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      charges: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      tax: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
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
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('merchant_mode_charges');
    await queryInterface.dropTable('merchant_charges');
    await queryInterface.dropTable('user_status');
    await queryInterface.dropTable('financial_details');
    await queryInterface.dropTable('merchant_details');
    await queryInterface.dropTable('users');
  }
}; 