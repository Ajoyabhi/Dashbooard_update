const mysql = require('mysql2/promise');

async function checkAndCreateDatabase() {
    try {
        // Create connection without database
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });

        console.log('Connected to MySQL server');

        // Check if database exists
        const [rows] = await connection.query('SHOW DATABASES LIKE "zintexpay_app"');
        
        if (rows.length === 0) {
            // Create database if it doesn't exist
            await connection.query('CREATE DATABASE zintexpay_app');
            console.log('Database "zintexpay_app" created successfully');
        } else {
            console.log('Database "zintexpay_app" already exists');
        }

        await connection.end();
        console.log('Connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAndCreateDatabase(); 