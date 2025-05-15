const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TransactionCharges = sequelize.define('TransactionCharges', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        transaction_type: {
            type: DataTypes.ENUM('payin', 'payout'),
            allowNull: false
        },
        reference_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        transaction_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        transaction_utr: {
            type: DataTypes.STRING,
            allowNull: true
        },
        merchant_charge: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        agent_charge: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        total_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'failed', 'payin_qr_generated'),
            defaultValue: 'pending'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        tableName: 'transaction_charges',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return TransactionCharges;
}; 