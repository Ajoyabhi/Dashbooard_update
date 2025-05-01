const mongoose = require('mongoose');

const apiLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  method: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  status_code: {
    type: Number,
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'user_model'
  },
  user_model: {
    type: String,
    enum: ['User', 'Agent', 'Admin'],
    required: false
  },
  ip_address: String,
  user_agent: String,
  request_headers: {
    type: mongoose.Schema.Types.Mixed
  },
  request_body: {
    type: mongoose.Schema.Types.Mixed
  },
  response_body: {
    type: mongoose.Schema.Types.Mixed
  },
  validation_result: {
    type: mongoose.Schema.Types.Mixed
  },
  error: {
    message: String,
    stack: String
  },
  processing_time: {
    type: Number
  },
  third_party_api: {
    name: String,
    endpoint: String,
    request: {
      type: mongoose.Schema.Types.Mixed
    },
    response: {
      type: mongoose.Schema.Types.Mixed
    },
    processing_time: Number
  }
}, {
  timestamps: true
});

// Indexes for faster queries
apiLogSchema.index({ timestamp: 1 });
apiLogSchema.index({ user_id: 1 });
apiLogSchema.index({ endpoint: 1 });
apiLogSchema.index({ status_code: 1 });

const ApiLog = mongoose.model('ApiLog', apiLogSchema);

module.exports = ApiLog; 