const { Sequelize } = require('sequelize');
const TransactionCharges = require('../models/TransactionCharges');

// Initialize Sequelize with XAMPP configuration
const sequelize = new Sequelize(
    'techturect',  // database name
    'root',        // username
    '',            // password (empty by default in XAMPP)
    {
        host: 'localhost',
        port: 3306,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Function to generate random number within range
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Function to generate random reference ID
const generateReferenceId = () => {
    const prefix = 'REF';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
};

// Generate dummy transaction charges
const generateDummyTransactionCharges = async () => {
    try {
        // Initialize the model
        const TransactionChargesModel = TransactionCharges(sequelize);
        await sequelize.authenticate();
        console.log('Connected to the database');

        const transactionCharges = [];
        const dates = [
            '2025-04-24',
            '2025-04-25',
            '2025-04-26',
            '2025-04-27',
            '2025-04-28',
            '2025-04-29'
        ];

        // Generate 5 transactions for each date
        for (const date of dates) {
            for (let i = 0; i < 5; i++) {
                const transactionAmount = getRandomNumber(1000, 50000);
                const merchantCharge = transactionAmount * 0.02; // 2% merchant charge
                const agentCharge = transactionAmount * 0.01; // 1% agent charge
                const totalCharges = merchantCharge + agentCharge;

                const transactionCharge = {
                    transaction_type: Math.random() > 0.5 ? 'payin' : 'payout',
                    reference_id: generateReferenceId(),
                    transaction_amount: transactionAmount,
                    transaction_utr: `UTR${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                    merchant_charge: merchantCharge,
                    agent_charge: agentCharge,
                    total_charges: totalCharges,
                    user_id: getRandomNumber(1, 5), // Assuming you have users with IDs 1-5
                    status: ['pending', 'completed', 'failed'][getRandomNumber(0, 2)],
                    metadata: {
                        ip_address: `192.168.1.${getRandomNumber(1, 255)}`,
                        device_info: 'Chrome/Windows',
                        location: 'New York, USA'
                    },
                    created_at: new Date(date),
                    updated_at: new Date(date)
                };

                transactionCharges.push(transactionCharge);
            }
        }

        await TransactionChargesModel.bulkCreate(transactionCharges);
        console.log('Successfully inserted 30 dummy transaction charges (5 for each date)');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

// Run the script
generateDummyTransactionCharges(); 