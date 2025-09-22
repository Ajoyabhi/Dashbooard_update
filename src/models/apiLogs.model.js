const mongoose = require('mongoose');

const apilogsSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
    enum: ['error', 'warn', 'info', 'debug', 'verbose']
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  service: {
    type: String,
    default: 'accuzpay-api'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for faster queries
apilogsSchema.index({ timestamp: -1 });
apilogsSchema.index({ level: 1 });

const Apilogs = mongoose.model('Apilogs', apilogsSchema);

module.exports = Apilogs;