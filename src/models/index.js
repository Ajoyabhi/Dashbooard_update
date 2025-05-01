const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(
    config.database.name,
    config.database.username,
    config.database.password,
    {
        host: config.database.host,
        dialect: 'mysql',
        logging: false
    }
);

// Import model definitions
const UserModel = require('./User');
const UserStatusModel = require('./UserStatus');
const MerchantDetailsModel = require('./MerchantDetails');
const MerchantChargesModel = require('./MerchantCharges');
const MerchantModeChargesModel = require('./MerchantModeCharges');
const FinancialDetailsModel = require('./FinancialDetails');
const PlatformChargesModel = require('./PlatformCharges');
const UserIPsModel = require('./UserIPs');
const TransactionChargesModel = require('./TransactionCharges');
const SettlementTransactionModel = require('./settlementTransaction.model');

// Initialize models
const User = UserModel(sequelize);
const UserStatus = UserStatusModel(sequelize);
const MerchantDetails = MerchantDetailsModel(sequelize);
const MerchantCharges = MerchantChargesModel(sequelize);
const MerchantModeCharges = MerchantModeChargesModel(sequelize);
const FinancialDetails = FinancialDetailsModel(sequelize);
const PlatformCharges = PlatformChargesModel(sequelize);
const UserIPs = UserIPsModel(sequelize);
const TransactionCharges = TransactionChargesModel(sequelize);
const SettlementTransaction = SettlementTransactionModel(sequelize);

// Define relationships
User.hasOne(UserStatus, { foreignKey: 'user_id', onDelete: 'CASCADE' });
UserStatus.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(MerchantDetails, { foreignKey: 'user_id', onDelete: 'CASCADE' });
MerchantDetails.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(MerchantCharges, { foreignKey: 'user_id', onDelete: 'CASCADE' });
MerchantCharges.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(MerchantModeCharges, { foreignKey: 'merchant_id', onDelete: 'CASCADE' });
MerchantModeCharges.belongsTo(User, { foreignKey: 'merchant_id' });

User.hasOne(FinancialDetails, { foreignKey: 'user_id', onDelete: 'CASCADE' });
FinancialDetails.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(UserIPs, { foreignKey: 'user_id', onDelete: 'CASCADE' });
UserIPs.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(TransactionCharges, { foreignKey: 'user_id', onDelete: 'CASCADE' });
TransactionCharges.belongsTo(User, { foreignKey: 'user_id' });

// Add SettlementTransaction relationships
User.hasMany(SettlementTransaction, { foreignKey: 'user_id', onDelete: 'CASCADE' });
SettlementTransaction.belongsTo(User, { foreignKey: 'user_id' });
SettlementTransaction.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
SettlementTransaction.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Export models
module.exports = {
    sequelize,
    User,
    UserStatus,
    MerchantDetails,
    MerchantCharges,
    MerchantModeCharges,
    FinancialDetails,
    PlatformCharges,
    UserIPs,
    TransactionCharges,
    SettlementTransaction
}; 