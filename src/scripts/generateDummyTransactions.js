const mongoose = require('mongoose');
const UserTransaction = require('../models/userTransaction.model');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Function to generate random number within range
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Function to generate random transaction ID
const generateTransactionId = () => {
  const prefix = 'TXN';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// Function to generate random reference ID
const generateReferenceId = () => {
  const prefix = 'REF';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// Sample data for generating realistic records
const sampleUsers = [
  { id: new mongoose.Types.ObjectId(), name: 'John Doe', email: 'john@example.com', mobile: '9876543210' },
  { id: new mongoose.Types.ObjectId(), name: 'Jane Smith', email: 'jane@example.com', mobile: '9876543211' },
  { id: new mongoose.Types.ObjectId(), name: 'Bob Wilson', email: 'bob@example.com', mobile: '9876543212' },
];

const sampleMerchants = [
  { name: 'Amazon Store', id: 'MERCH001', type: 'retail' },
  { name: 'Tech Solutions', id: 'MERCH002', type: 'technology' },
  { name: 'Food Express', id: 'MERCH003', type: 'food' },
];

const sampleRemarks = [
  'Payment for services',
  'Monthly subscription',
  'Product purchase',
  'Service fee',
  'Refund processing'
];

// Generate dummy transactions
const generateDummyTransactions = async () => {
  const transactions = [];

  for (let i = 0; i < 25; i++) {
    const amount = getRandomNumber(100, 10000);
    const adminCharge = amount * 0.02; // 2% admin charge
    const agentCharge = amount * 0.01; // 1% agent charge
    const totalCharges = adminCharge + agentCharge;
    const beforeBalance = getRandomNumber(1000, 50000);
    const afterBalance = beforeBalance + (amount - totalCharges);
    const selectedMerchant = sampleMerchants[getRandomNumber(0, sampleMerchants.length - 1)];

    const transaction = {
      transaction_id: generateTransactionId(),
      user: sampleUsers[getRandomNumber(0, sampleUsers.length - 1)],
      transaction_type: Math.random() > 0.5 ? 'payin' : 'payout',
      amount: amount,
      charges: {
        admin_charge: adminCharge,
        agent_charge: agentCharge,
        total_charges: totalCharges
      },
      merchant_details: {
        merchant_name: selectedMerchant.name,
        merchant_id: selectedMerchant.id,
        merchant_type: selectedMerchant.type,
        merchant_callback_url: 'https://api.example.com/callback'
      },
      balance: {
        before: beforeBalance,
        after: afterBalance
      },
      status: ['pending', 'processing', 'completed', 'failed'][getRandomNumber(0, 3)],
      reference_id: generateReferenceId(),
      remark: sampleRemarks[getRandomNumber(0, sampleRemarks.length - 1)],
      metadata: {
        ip_address: `192.168.1.${getRandomNumber(1, 255)}`,
        device_info: 'Chrome/Windows',
        location: 'New York, USA'
      },
      created_by: sampleUsers[0].id,
      created_by_model: 'User'
    };

    transactions.push(transaction);
  }

  try {
    await UserTransaction.insertMany(transactions);
    console.log('Successfully inserted 25 dummy transactions');
    process.exit(0);
  } catch (error) {
    console.error('Error inserting dummy transactions:', error);
    process.exit(1);
  }
};

// Run the script
generateDummyTransactions(); 