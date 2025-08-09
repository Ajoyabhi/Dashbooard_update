require('dotenv').config();

module.exports = {
  development: {
    username: 'root',
    password: '',
    database: 'zintexpay_app',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
  },
  test: {
    username: 'apizentexpay_zentexpay',
    password: 'user@007',
    database: 'apizentexpay_zentexpay',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
  },
  production: {
    host: 'localhost',
    port: 3306,
    database: 'apizentexpay_zentexpay',
    username: 'apizentexpay_zentexpay',
    password: 'user@007',
    dialect: 'mysql',
    logging: false
  }
}; 