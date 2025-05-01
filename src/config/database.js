const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
const config = require('./index');

// MySQL Configuration for XAMPP
const sequelize = new Sequelize(
    'techturect',  // database name
    'root',        // username
    '',            // password (empty by default in XAMPP)
    {
        host: 'localhost',
        port: 3306,
        dialect: 'mysql',
        logging: config.server.env === 'development' ? console.log : false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('MySQL Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to MySQL database:', err);
    });

// MongoDB Configuration
mongoose.connect(config.mongodb.uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

module.exports = {
    sequelize,
    mongoose
}; 