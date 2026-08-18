const { DataTypes } = require('sequelize');

/**
 * Per-user (merchant) agent commission RATE — REPORT-ONLY.
 *
 * This is deliberately SEPARATE from MerchantCharges so it never touches the
 * live transaction/charge logic. The merchant is always charged only the admin
 * (total) charge; this rate is used purely to compute the agent's cut when
 * building the commission dashboard and the downloadable report:
 *
 *   agent commission = transaction amount * agent_rate / 100
 *
 * One row per user. Rates are percentages.
 */
module.exports = (sequelize) => {
  const AgentCommissionRate = sequelize.define('AgentCommissionRate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' }
    },
    agent_payin_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    agent_payout_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'agent_commission_rates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return AgentCommissionRate;
};
