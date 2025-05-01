require('dotenv').config();

module.exports = {
  development: {
    username: 'root',
    password: '',
    database: 'techturect',
    host: 'localhost',
    dialect: 'mysql',
    logging: console.log
  },
  test: {
    username: 'root',
    password: '',
    database: 'techturect_test',
    host: 'localhost',
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
}; 