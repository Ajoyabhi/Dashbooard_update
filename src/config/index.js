require('dotenv').config();

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    database: {
        host: 'localhost',
        port: 3306,
        database: 'zintexpay_app',
        username: 'root',
        password: ''
    },
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://paydexadmin:j123KJkslw21Bk34G@10.10.22.98:27017/techturect?authSource=admin'
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '365d'
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
}; 