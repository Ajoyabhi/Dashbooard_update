const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ManageFundRequest = sequelize.define('ManageFundRequest', {
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
        settlement_wallet: {
            type: DataTypes.DECIMAL(20, 2),
            allowNull: false,
            defaultValue: 0
        },
        wallet_balance: {
            type: DataTypes.DECIMAL(20, 2),
            allowNull: false,
            defaultValue: 0
        },
        reference_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        from_bank: {
            type: DataTypes.STRING,
            allowNull: false
        },
        to_bank: {
            type: DataTypes.STRING,
            allowNull: false
        },
        payment_type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
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
        tableName: 'manage_fund_requests',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return ManageFundRequest;
}; 