const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const MerchantDetails = sequelize.define('MerchantDetails', {
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
        payin_merchant_assigned: {
            type: DataTypes.STRING(50)
        },
        payin_merchant_name: {
            type: DataTypes.STRING(100)
        },
        payout_merchant_assigned: {
            type: DataTypes.STRING(50)
        },
        payout_merchant_name: {
            type: DataTypes.STRING(100)
        },
        user_key: {
            type: DataTypes.STRING(100)
        },
        user_token: {
            type: DataTypes.STRING(255)
        },
        payin_callback: {
            type: DataTypes.STRING(255)
        },
        payout_callback: {
            type: DataTypes.STRING(255)
        },
        gst: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
            comment: 'Per-user GST percentage; NULL falls back to global PlatformCharges.gst'
        },
        dummy_utr_prefix: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: null,
            comment: 'Leading digits for the synthetic UTR on DummyGateway payouts; rest is random up to the total UTR length'
        }
    }, {
        tableName: 'merchant_details',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return MerchantDetails;
}; 