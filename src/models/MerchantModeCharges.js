const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const MerchantModeCharges = sequelize.define('MerchantModeCharges', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        merchant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        charge_type: {
            type: DataTypes.ENUM('percentage', 'fixed'),
            allowNull: false
        },
        mode: {
            type: DataTypes.ENUM('payin', 'payout'),
            allowNull: false
        },
        start_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        end_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        tax: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        }
    }, {
        tableName: 'merchant_mode_charges',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return MerchantModeCharges;
}; 