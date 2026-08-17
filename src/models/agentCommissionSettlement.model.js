const { DataTypes } = require('sequelize');

/**
 * Agent-commission settlement ledger, keyed PER USER (merchant).
 *
 * Each row records a commission payout MADE against a user's transactions. It is
 * the "watermark" that keeps us from paying the same commission twice.
 *
 *   payable(user,type) = SUM(agent_charge on that user's completed txns)  [accrued]
 *                      - SUM(amount here for that user+type)              [settled]
 *
 * Because payable is always recomputed from source, a transaction that flips to
 * 'completed' after a settlement was recorded can never cause a double-payment
 * or a loss — it simply adds to the next payable amount.
 *
 * Payin and payout are independent ledgers, distinguished by `type`.
 */
module.exports = (sequelize) => {
  const AgentCommissionSettlement = sequelize.define('AgentCommissionSettlement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // The merchant/user whose commission this settlement pays down.
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    // Which commission ledger this settlement pays down.
    type: {
      type: DataTypes.ENUM('payin', 'payout'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    // Admin who recorded the settlement.
    settled_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'agent_commission_settlements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id', 'type'] }
    ]
  });

  return AgentCommissionSettlement;
};
