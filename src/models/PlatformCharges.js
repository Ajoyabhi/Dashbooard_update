const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PlatformCharges = sequelize.define('PlatformCharges', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        charge: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Platform charge percentage'
        },
        gst: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'GST percentage'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
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
        tableName: 'platform_charges',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return PlatformCharges;
}; 