const mongoose = require('mongoose');
const UserTransaction = require('../models/userTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');

// Dummy user data
const dummyUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', mobile: '9876543210' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', mobile: '9876543211' },
  { id: 3, name: 'Bob Wilson', email: 'bob@example.com', mobile: '9876543212' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', mobile: '9876543213' },
  { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', mobile: '9876543214' },
  { id: 6, name: 'Emma Taylor', email: 'emma@example.com', mobile: '9876543215' },
  { id: 7, name: 'Frank Miller', email: 'frank@example.com', mobile: '9876543216' }
];

// Generate random amount between 1000 and 10000
const getRandomAmount = () => Math.floor(Math.random() * 9000) + 1000;

// Generate random charges
const getRandomCharges = (amount) => {
  const adminCharge = Math.floor(amount * 0.02); // 2% admin charge
  const agentCharge = Math.floor(amount * 0.01); // 1% agent charge
  return {
    admin_charge: adminCharge,
    agent_charge: agentCharge,
    total_charges: adminCharge + agentCharge
  };
};

// Generate random status
const getRandomStatus = () => {
  const statuses = ['pending', 'processing', 'completed', 'failed'];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

// Generate dummy user transactions
const generateUserTransactions = async () => {
  const transactions = [];
  
  for (let i = 0; i < 20; i++) {
    const user = dummyUsers[Math.floor(Math.random() * dummyUsers.length)];
    const amount = getRandomAmount();
    const charges = getRandomCharges(amount);
    
    transactions.push({
      transaction_id: `UTX${Date.now()}${i}`,
      user: {
        id: new mongoose.Types.ObjectId(),
        user_id: user.id.toString(),
        name: user.name,
        email: user.email,
        mobile: user.mobile
      },
      transaction_type: Math.random() > 0.5 ? 'payin' : 'payout',
      amount: amount,
      charges: charges,
      merchant_details: {
        merchant_name: `Merchant ${i + 1}`,
        merchant_callback_url: `https://merchant${i + 1}.com/callback`
      },
      balance: {
        before: amount - charges.total_charges,
        after: amount
      },
      status: getRandomStatus(),
      reference_id: `REF${Date.now()}${i}`,
      remark: `Transaction ${i + 1}`,
      metadata: {},
      created_by: new mongoose.Types.ObjectId(),
      created_by_model: 'User'
    });
  }
  
  return transactions;
};

// Generate dummy payout transactions
const generatePayoutTransactions = async () => {
  const transactions = [];
  
  for (let i = 0; i < 20; i++) {
    const user = dummyUsers[Math.floor(Math.random() * dummyUsers.length)];
    const amount = getRandomAmount();
    const charges = getRandomCharges(amount);
    
    transactions.push({
      transaction_id: `PTX${Date.now()}${i}`,
      user: {
        id: new mongoose.Types.ObjectId(),
        user_id: user.id.toString(),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        userType: 'customer'
      },
      amount: amount,
      charges: charges,
      beneficiary_details: {
        account_number: `1234567890${i}`,
        account_ifsc: 'HDFC0001234',
        bank_name: 'HDFC Bank',
        beneficiary_name: user.name
      },
      reference_id: `PREF${Date.now()}${i}`,
      status: getRandomStatus(),
      gateway_response: {
        reference_id: `GREF${Date.now()}${i}`,
        status: getRandomStatus(),
        message: 'Transaction processed successfully',
        raw_response: {}
      },
      metadata: {},
      remark: `Payout Transaction ${i + 1}`,
      created_by: new mongoose.Types.ObjectId(),
      created_by_model: 'User'
    });
  }
  
  return transactions;
};

// Main function to seed the database
const seedDatabase = async () => {
  try {
    // Connect to MongoDB with authentication
    await mongoose.connect('mongodb://paydexadmin:j123KJkslw21Bk34G@10.10.22.98:27017/techturect?authSource=admin');
    
    // Clear existing data
    await UserTransaction.deleteMany({});
    await PayoutTransaction.deleteMany({});
    
    // Generate and insert user transactions
    const userTransactions = await generateUserTransactions();
    await UserTransaction.insertMany(userTransactions);
    console.log('User transactions seeded successfully');
    
    // Generate and insert payout transactions
    const payoutTransactions = await generatePayoutTransactions();
    await PayoutTransaction.insertMany(payoutTransactions);
    console.log('Payout transactions seeded successfully');
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase(); 