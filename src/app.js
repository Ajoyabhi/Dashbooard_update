require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const { logger, stream } = require('./utils/logger');
const { captureResponseBody, measureProcessingTime, logApiRequest } = require('./middleware/apiLogger.middleware');
const helmet = require('helmet');
const { sequelize } = require('./config/database');
const config = require('./config');

// Debug Redis configuration
logger.info('Redis Configuration:', {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  tls: process.env.REDIS_TLS,
  hasPassword: !!process.env.REDIS_PASSWORD
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const agentRoutes = require('./routes/agent.routes');
const adminRoutes = require('./routes/admin.routes');
const paymentRoutes = require('./routes/payment.routes');

const app = express();

// Trust proxy
app.set('trust proxy', true);

// Connect to MongoDB (shared, warm-pooled, Atlas-correct connector)
const { connectMongo } = require('./config/mongoConnect');
connectMongo().catch(() => { /* logged inside connectMongo; server keeps trying on next call */ });

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API logging middleware
app.use(captureResponseBody);
app.use(measureProcessingTime);
app.use(logApiRequest);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Database connection and server start
const PORT = process.env.PORT || 3004;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    await sequelize.sync();
    console.log('Database synchronized successfully.');

    // Only start the server if it's not already running
    if (!module.parent) {
      app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; 