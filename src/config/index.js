require('dotenv').config();

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        database: process.env.DB_NAME || 'accuzpay_db',
        username: process.env.DB_USER || 'admin',
        password: process.env.DB_PASSWORD || 'Jmlastro@2025'
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