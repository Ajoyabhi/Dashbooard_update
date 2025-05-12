const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
const config = require('./index');
const { logger } = require('../utils/logger');

// MySQL Configuration for XAMPP
const sequelize = new Sequelize(
    'techturect',  // database name
    'root',        // username
    '',            // password (empty by default in XAMPP)
    {
        host: 'localhost',
        port: 3306,
        dialect: 'mysql',
        logging: (msg) => logger.debug(msg),
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true
        }
    }
);

// Test the connection
sequelize.authenticate()
    .then(() => {
        logger.info('MySQL Connection has been established successfully.');
    })
    .catch(err => {
        logger.error('Unable to connect to MySQL database:', err);
        process.exit(1); // Exit if database connection fails
    });

// MongoDB Configuration
mongoose.connect(config.mongodb.uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => logger.info('Connected to MongoDB'))
.catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1); // Exit if database connection fails
});

module.exports = {
    sequelize,
    mongoose
}; 