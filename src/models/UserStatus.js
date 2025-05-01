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
        }
    }, {
        tableName: 'user_status',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return UserStatus;
}; 