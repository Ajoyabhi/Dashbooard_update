const mongoose = require('mongoose');

const userTransactionSchema = new mongoose.Schema({
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
    mobile: String
  },
  transaction_type: {
    type: String,
    enum: ['payin', 'payout'],
    required: true
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
  merchant_details:{ 
    merchant_name :{
    name: String,
    id: String,
    type: String
  },
  merchant_callback_url: {
    type: String,
    required: true
  } 
  },
  gateway_response: {
    utr: String,
    status: String,
    message: String,
    merchant_response: String,
    raw_response: mongoose.Schema.Types.Mixed,
  },
  balance: {
    before: {
      type: Number,
      required: true
    },
    after: {
      type: Number,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'payin_qr_generated'],
    default: 'pending'
  },
  reference_id: {
    type: String,
    required: true
  },
  remark: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'created_by_model'
  },
  created_by_model: {
    type: String,
    required: true,
    enum: ['agent', 'admin','payin_payout','payout_only','payin_only']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
userTransactionSchema.index({ transaction_id: 1 });
userTransactionSchema.index({ user: 1 });
userTransactionSchema.index({ transaction_type: 1 });
userTransactionSchema.index({ status: 1 });
userTransactionSchema.index({ created_at: 1 });

const UserTransaction = mongoose.model('UserTransaction', userTransactionSchema);

module.exports = UserTransaction; 