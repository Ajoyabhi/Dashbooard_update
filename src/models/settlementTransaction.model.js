const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SettlementTransaction = sequelize.define('SettlementTransaction', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        amount: {
            type: DataTypes.DECIMAL(20, 2),
            allowNull: false
        },
        wallet_balance_before: {
            type: DataTypes.DECIMAL(20, 2),
            allowNull: false
        },
        wallet_balance_after: {
            type: DataTypes.DECIMAL(20, 2),
            allowNull: false
        },
        settlement_balance_before: {
            type: DataTypes.DECIMAL(20, 2),
            allowNull: false
        },
        settlement_balance_after: {
            type: DataTypes.DECIMAL(20, 2),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('completed', 'failed'),
            defaultValue: 'completed'
        },
        remark: {
            type: DataTypes.STRING,
            allowNull: true
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    }, {
        tableName: 'settlement_transactions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return SettlementTransaction;
};