const mongoose = require('mongoose');

const payoutTransactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    user_id: {
      type: String,
      required: true,
      comment: 'Reference to SQL database user table'
    },
    name: String,
    email: String,
    mobile: String,
    userType: String
  },
  amount: {
    type: Number,
    required: true
  },
  charges: {
    admin_charge: {
      type: Number,
      required: true
    },
    agent_charge: {
      type: Number,
      required: true
    },
    total_charges: {
      type: Number,
      required: true
    }
  },
  beneficiary_details: {
    account_number: {
      type: String,
      required: true
    },
    account_ifsc: {
      type: String,
      required: true
    },
    bank_name: {
      type: String,
      required: true
    },
    beneficiary_name: {
      type: String,
      required: true
    }
  },
  reference_id: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  gst_amount: {
    type: Number,
    default: 0,
    allowNull: true
  },
  platform_fee: {
    type: Number,
    default: 0,
    allowNull: true
  },
  gateway_response: {
    utr: String,
    status: String,
    message: String,
    merchant_response: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  remark: {
    type: String,
    required: true
  },   
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'created_by_model'
  },
  created_by_model: {
    type: String,
    required: true,
    enum: ['User', 'Agent', 'Admin','payin_payout','payout_only','payin_only']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
payoutTransactionSchema.index({ transaction_id: 1 });
payoutTransactionSchema.index({ user: 1 });
payoutTransactionSchema.index({ status: 1 });
payoutTransactionSchema.index({ created_at: 1 });

const PayoutTransaction = mongoose.model('PayoutTransaction', payoutTransactionSchema);

module.exports = PayoutTransaction; 