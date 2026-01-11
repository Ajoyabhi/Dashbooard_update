require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'payvex_user',
    password: process.env.DB_PASSWORD || 'Payzutech@2025#',
    database: process.env.DB_NAME || 'payvex',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  test: {
    username: process.env.DB_USER || 'payvex_user',
    password: process.env.DB_PASSWORD || 'Payzutech@2025#',
    database: process.env.DB_NAME || 'payvex',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USER || 'payvex_user',
    password: process.env.DB_PASSWORD || 'Payzutech@2025#',
    database: process.env.DB_NAME || 'payvex',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
}; 