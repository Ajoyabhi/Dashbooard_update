const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayoutFailedHistory = sequelize.define('PayoutFailedHistory', {
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
        reference_id: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        transaction_id: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        transaction_type: {
            type: DataTypes.ENUM('UserTransaction', 'PayoutTransaction'),
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        charges: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
        },
        total_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        wallet_balance_before: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        wallet_balance_after: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        beneficiary_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        beneficiary_account: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        beneficiary_ifsc: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        bank_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        utr_number: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        remark: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        failed_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        original_status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pending'
        },
        new_status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'failed'
        }
    }, {
        tableName: 'payout_failed_history',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Define associations
    PayoutFailedHistory.associate = (models) => {
        PayoutFailedHistory.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
        
        PayoutFailedHistory.belongsTo(models.User, {
            foreignKey: 'failed_by',
            as: 'failedByUser'
        });
    };

    return PayoutFailedHistory;
}; 