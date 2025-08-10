const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(
    'zintexpay_app',  // database name
    'root',        // username
    '',            // password (empty by default in XAMPP)
    {
        host: 'localhost',
        port: 3306,
        dialect: 'mysql'
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
const ManageFundRequestModel = require('./manageFundRequest.model');
const WalletTransactionModel = require('./WalletTransaction');
const PayoutFailedHistoryModel = require('./PayoutFailedHistory');

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
const ManageFundRequest = ManageFundRequestModel(sequelize);
const WalletTransaction = WalletTransactionModel(sequelize);
const PayoutFailedHistory = PayoutFailedHistoryModel(sequelize);

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

// Add ManageFundRequest relationships
User.hasMany(ManageFundRequest, { foreignKey: 'user_id', onDelete: 'CASCADE' });
ManageFundRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ManageFundRequest.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
ManageFundRequest.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Add WalletTransaction relationships
User.hasMany(WalletTransaction, { foreignKey: 'user_id', onDelete: 'CASCADE' });
WalletTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
WalletTransaction.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

// Add PayoutFailedHistory relationships
User.hasMany(PayoutFailedHistory, { foreignKey: 'user_id', onDelete: 'CASCADE' });
PayoutFailedHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
PayoutFailedHistory.belongsTo(User, { foreignKey: 'failed_by', as: 'failedByUser' });

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
    SettlementTransaction,
    ManageFundRequest,
    WalletTransaction,
    PayoutFailedHistory
}; 