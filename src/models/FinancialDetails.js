const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinancialDetails = sequelize.define('FinancialDetails', {
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
        settlement: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        wallet: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        lien: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        rolling_reserve: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        }
    }, {
        tableName: 'financial_details',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return FinancialDetails;
}; 