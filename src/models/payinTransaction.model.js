const mongoose = require('mongoose');

const payinTransactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    user_id: {
      type: String,
      required: true
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
    admin_charge: Number,
    agent_charge: Number,
    total_charges: Number
  },
  beneficiary_details: {
    beneficiary_name: String,
    beneficiary_email: String,
    beneficiary_phone: String
  },
  reference_id: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'payin_qr_generated'],
    default: 'pending'
  },
  gst_amount: {
    type: Number,
    default: 0
  },
  platform_fee: {
    type: Number,
    default: 0
  },
  gateway_response: {
    utr: String,
    status: String,
    message: String,
    upi_string: String,
    raw_response: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    requested_ip: String,
    callback_received_at: Date
  },
  remark: String,
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  created_by_model: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
payinTransactionSchema.index({ transaction_id: 1 });
payinTransactionSchema.index({ reference_id: 1 });
payinTransactionSchema.index({ 'user.id': 1 });
payinTransactionSchema.index({ status: 1 });
payinTransactionSchema.index({ createdAt: 1 });

const PayinTransaction = mongoose.model('PayinTransaction', payinTransactionSchema);

module.exports = PayinTransaction; 