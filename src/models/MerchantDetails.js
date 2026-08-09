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
        },
        payout_gateway_threshold: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: null,
            comment: 'Amount cutoff for gateway routing; NULL disables routing (uses payout_merchant_name)'
        },
        payout_gateway_above: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: null,
            comment: 'Gateway used when amount >= payout_gateway_threshold'
        },
        payout_gateway_below: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: null,
            comment: 'Gateway used when amount < payout_gateway_threshold'
        },
        // N-tier amount-range routing. When set to a valid non-empty array it
        // supersedes the legacy single-threshold columns above. Each band is
        // { min, max, gateway } and matches when amount >= min && (max === null
        // || amount < max). See src/utils/payoutGatewayRouting.js.
        payout_gateway_bands: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            comment: 'Ordered JSON array of {min,max,gateway} amount bands; NULL/empty falls back to legacy threshold then payout_merchant_name'
        }
    }, {
        tableName: 'merchant_details',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return MerchantDetails;
}; 