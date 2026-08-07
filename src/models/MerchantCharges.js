const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const MerchantCharges = sequelize.define('MerchantCharges', {
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
        start_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        end_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        // Separate payin/payout amount ranges. NULL falls back to the legacy
        // shared start_amount/end_amount (see 20260807000000 migration).
        payin_start_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true
        },
        payin_end_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true
        },
        payout_start_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true
        },
        payout_end_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true
        },
        admin_payin_charge: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        admin_payout_charge: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        agent_payin_charge: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        agent_payout_charge: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        admin_payin_charge_type: {
            type: DataTypes.ENUM('percentage', 'fixed'),
            allowNull: false
        },
        admin_payout_charge_type: {
            type: DataTypes.ENUM('percentage', 'fixed'),
            allowNull: false
        },
        agent_payin_charge_type: {
            type: DataTypes.ENUM('percentage', 'fixed'),
            allowNull: false
        },
        agent_payout_charge_type: {
            type: DataTypes.ENUM('percentage', 'fixed'),
            allowNull: false
        },
        created_by: {
            type: DataTypes.INTEGER,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        updated_by: {
            type: DataTypes.INTEGER,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    }, {
        tableName: 'merchant_charges',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return MerchantCharges;
}; 