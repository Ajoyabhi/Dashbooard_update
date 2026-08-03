const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
const config = require('./index');
const { logger } = require('../utils/logger');

console.log(config)
// MySQL Configuration
const sequelize = new Sequelize(
    config.database.database,  // database name
    config.database.username,  // username
    config.database.password,  // password
    {
        host: config.database.host,
        port: config.database.port,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
        // Env-driven so the co-located VPS (API + MySQL + Redis share the box) can
        // be tuned without code changes. Remember: total MySQL connections =
        // DB_POOL_MAX × number of processes, and must stay under MySQL's
        // max_connections. Default bumped 5 -> 15 as a safe starting point.
        pool: {
            max: parseInt(process.env.DB_POOL_MAX || '15', 10),
            min: parseInt(process.env.DB_POOL_MIN || '0', 10),
            acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
            idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10)
        },
        define: {
            timestamps: true,
            underscored: true
        }
    }
);

// Test the connection
// Test the connection
sequelize.authenticate()
    .then(() => {
        logger.info('MySQL Connection has been established successfully.');
    })
    .catch(err => {
        logger.error('Unable to connect to MySQL database:', err);
        process.exit(1); // Exit if database connection fails
    });

// MongoDB Configuration — use the shared, warm-pooled, Atlas-correct connector.
// Idempotent: no-ops if another module already connected.
const { connectMongo } = require('./mongoConnect');
connectMongo().catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1); // Exit if database connection fails
});

module.exports = {
    sequelize,
    mongoose
}; 