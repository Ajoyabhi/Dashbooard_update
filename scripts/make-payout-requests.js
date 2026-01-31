const axios = require('axios');

// Configuration
const API_URL = 'https://payvex.in/api/payments/payout';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcl90eXBlIjoicGF5aW5fcGF5b3V0IiwiaWF0IjoxNzY5Njc5MDU3LCJleHAiOjE4MDEyMTUwNTd9.lj0cE9lHqL5_MIYqZoWcmHEOrpqJEtA6d8yJ-bqCkB8';

// Account 1: UBI
const ACCOUNT1 = {
  number: '497102010031582',
  ifsc: 'UBIN0549711',
  bank: 'UBI'
};

// Account 2: HDFC
const ACCOUNT2 = {
  number: '50100691061012',
  ifsc: 'HDFC0004217',
  bank: 'HDFC'
};

// Random first names
const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Kavya', 'Arjun', 'Sneha',
  'Rahul', 'Meera', 'Karan', 'Divya', 'Siddharth', 'Pooja', 'Aditya', 'Neha',
  'Raj', 'Shreya', 'Aman', 'Riya', 'Vivek', 'Anjali', 'Nikhil', 'Kriti',
  'Sahil', 'Tanvi', 'Rohit', 'Isha', 'Kunal', 'Aishwarya', 'Varun', 'Sanjana'
];

// Random last names
const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Yadav', 'Shah',
  'Mehta', 'Jain', 'Agarwal', 'Reddy', 'Nair', 'Malhotra', 'Chopra', 'Kapoor',
  'Bansal', 'Goyal', 'Arora', 'Saxena', 'Mittal', 'Tiwari', 'Joshi', 'Pandey',
  'Desai', 'Rao', 'Iyer', 'Narayan', 'Krishnan', 'Menon', 'Nair', 'Pillai'
];

// Function to generate random name
const generateRandomName = () => {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
};

// Reference IDs
const REF_IDS = [
  'mp483920KZRTM',
  'mp102947QWJLA',
  'mp775301XMNQP',
  'mp349862ABYTR',
  'mp590174LQXWE',
  'ap264981ZQWRT',
  'tx918273MNQPL',
  'pg456702KJHQT',
  'gw830194ZXCAP',
  'id671095QPLMX'
];

// Amounts that sum to 20000 (distributed across 10 transactions)
const AMOUNTS = [
  2000,  // mp483920KZRTM
  1500,  // mp102947QWJLA
  2500,  // mp775301XMNQP
  1800,  // mp349862ABYTR
  2200,  // mp590174LQXWE
  2000,  // ap264981ZQWRT
  1500,  // tx918273MNQPL
  2500,  // pg456702KJHQT
  2000,  // gw830194ZXCAP
  2000   // id671095QPLMX
];

// Function to sleep/delay
const sleep = (seconds) => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

// Function to get random delay between 2-5 seconds
const getRandomDelay = () => {
  return Math.floor(Math.random() * 4) + 2; // 2-5 seconds
};

// Function to make payout request
const makePayout = async (refId, amount, account, beneficiaryName) => {
  try {
    console.log('\nMaking payout request...');
    console.log(`Reference ID: ${refId}`);
    console.log(`Amount: ${amount}`);
    console.log(`Account: ${account.number}`);
    console.log(`IFSC: ${account.ifsc}`);
    console.log(`Bank: ${account.bank}`);
    console.log(`Beneficiary: ${beneficiaryName}`);
    console.log('---');

    const response = await axios.post(API_URL, {
      amount: amount.toString(),
      account_number: account.number,
      account_ifsc: account.ifsc,
      bank_name: account.bank,
      beneficiary_name: beneficiaryName,
      request_type: 'IMPS',
      reference_id: refId
    }, {
      headers: {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
  } catch (error) {
    console.log('❌ Error!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      return { success: false, error: error.response.data };
    } else {
      console.log('Error:', error.message);
      return { success: false, error: error.message };
    }
  }
};

// Main function to process all payouts
const processAllPayouts = async () => {
  console.log('Starting payout requests...');
  console.log(`Total transactions: ${REF_IDS.length}`);
  console.log(`Total amount: ${AMOUNTS.reduce((a, b) => a + b, 0)}`);
  console.log('==========================================\n');

  const results = [];

  for (let i = 0; i < REF_IDS.length; i++) {
    const refId = REF_IDS[i];
    const amount = AMOUNTS[i];
    
    // Alternate between accounts and generate random name for each
    const account = i % 2 === 0 ? ACCOUNT1 : ACCOUNT2;
    const beneficiaryName = generateRandomName();
    
    const result = await makePayout(refId, amount, account, beneficiaryName);
    results.push({ refId, amount, account: account.bank, beneficiary: beneficiaryName, ...result });
    
    // Add delay between requests (except for the last one)
    if (i < REF_IDS.length - 1) {
      const delay = getRandomDelay();
      console.log(`\nWaiting ${delay} seconds before next request...`);
      await sleep(delay);
    }
    
    console.log('\n==========================================');
  }

  console.log('\n\nAll payout requests completed!');
  console.log('\nSummary:');
  console.log('==========================================');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.refId}: ₹${result.amount} - ${result.account} - ${result.beneficiary} - ${result.success ? 'Success' : 'Failed'}`);
  });
  console.log('==========================================');
  console.log(`Total amount: ₹${AMOUNTS.reduce((a, b) => a + b, 0)}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
};

// Run the script
processAllPayouts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

