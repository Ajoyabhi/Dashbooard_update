const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['payin', 'payout'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  sender: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'sender.model'
    },
    model: {
      type: String,
      required: true,
      enum: ['User', 'Agent']
    },
    name: String,
    email: String,
    mobile: String
  },
  recipient: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipient.model'
    },
    model: {
      type: String,
      required: true,
      enum: ['User', 'Agent']
    },
    name: String,
    email: String,
    mobile: String
  },
  gateway_response: {
    reference_id: String,
    status: String,
    message: String,
    raw_response: mongoose.Schema.Types.Mixed
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
    enum: ['User', 'Agent', 'Admin']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ transaction_id: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ 'sender.id': 1 });
transactionSchema.index({ 'recipient.id': 1 });
transactionSchema.index({ created_at: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 