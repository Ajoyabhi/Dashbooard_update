const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const WalletTransaction = sequelize.define('WalletTransaction', {
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
        transaction_type: {
            type: DataTypes.ENUM('credit', 'debit'),
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        balance_before: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        balance_after: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        remark: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    }, {
        tableName: 'wallet_transactions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Define associations
    WalletTransaction.associate = (models) => {
        WalletTransaction.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
        
        WalletTransaction.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'createdByUser'
        });
    };

    return WalletTransaction;
}; 