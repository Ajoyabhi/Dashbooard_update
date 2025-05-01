const mongoose = require('mongoose');

const apiLogsSchema = new mongoose.Schema({
  request: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true
  },
  service_api: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  error_message: {
    type: String
  },
  execution_time: {
    type: Number  // in milliseconds
  }
}, {
  timestamps: true  // This will add createdAt and updatedAt fields automatically
});

// Indexes for faster queries
apiLogsSchema.index({ service: 1 });
apiLogsSchema.index({ service_api: 1 });
apiLogsSchema.index({ createdAt: 1 });

const ApiLogs = mongoose.model('ApiLogs', apiLogsSchema);

module.exports = ApiLogs; 