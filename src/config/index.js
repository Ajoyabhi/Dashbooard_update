require('dotenv').config();

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        name: process.env.DB_DATABASE || 'techturect',
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || ''
    },
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://paydexadmin:j123KJkslw21Bk34G@10.10.22.98:27017/techturect?authSource=admin'
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
}; 