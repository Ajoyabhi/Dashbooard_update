const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAndCreateDatabase() {
    try {
        // Create connection without database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'admin',
            password: process.env.DB_PASSWORD || 'Jmlastro@2025'
        });

        console.log('Connected to MySQL server');

        // Check if database exists
        const dbName = process.env.DB_NAME || 'accuzpay_db';
        const [rows] = await connection.query(`SHOW DATABASES LIKE "${dbName}"`);

        if (rows.length === 0) {
            // Create database if it doesn't exist
            await connection.query(`CREATE DATABASE ${dbName}`);
            console.log(`Database "${dbName}" created successfully`);
        } else {
            console.log(`Database "${dbName}" already exists`);
        }

        await connection.end();
        console.log('Connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAndCreateDatabase(); 