const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserStatus = sequelize.define('UserStatus', {
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
        status: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        payout_status: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        api_status: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        payin_status: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        payouts_status: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        tecnical_issue: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        vouch: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        iserveu: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        bank_deactive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        // Per-user payout kill switch. When true, payout requests are rejected
        // immediately with a standard "temporarily suspended" message BEFORE any
        // settlement is debited and WITHOUT hitting any gateway (regardless of the
        // gateway configured/routed for the merchant).
        payout_suspended: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        // Per-user payin kill switch. When true, payin requests are rejected
        // immediately with a realistic "service unavailable" message BEFORE any
        // transaction record is created and WITHOUT hitting any gateway
        // (regardless of the payin gateway configured for the merchant).
        payin_suspended: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'user_status',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return UserStatus;
}; 