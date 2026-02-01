const axios = require('axios');

// Configuration
const API_URL = 'https://payvex.in/api/payments/payout';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwidXNlcl90eXBlIjoicGF5aW5fcGF5b3V0IiwiaWF0IjoxNzY5OTMwNzU3LCJleHAiOjE4MDE0NjY3NTd9.jJLokRi3vdH6FYOhLHQbkEafrRYEo7z36Tp_1Rd7J3I';

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

// Account 3: Kotak
const ACCOUNT3 = {
  number: '3512293328',
  ifsc: 'KKBK0005297',
  bank: 'Kotak'
};

const ACCOUNT4 = {
  number: '4512279701',
  ifsc: 'KKBK0005028',
  bank: 'Kotak'
};

// Function to generate random 5-digit number
const generateRandomDigits = (length = 5) => {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
};

// Function to generate random 3 uppercase letters
const generateRandomLetters = (length = 3) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
};

// Function to generate beneficiary name in format: B-{5digits}{3letters}
const generateBeneficiaryName = () => {
  const digits = generateRandomDigits(5);
  const letters = generateRandomLetters(3);
  return `B-${digits}${letters}`;
};

// Track used reference IDs to ensure uniqueness
const usedReferenceIds = new Set();

// Function to generate reference ID in format: A{YYYYMMDDHHMMSS}{milliseconds_first_digit}{first3digits}
const generateReferenceId = (beneficiaryName) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  const millisecondsFirstDigit = milliseconds[0]; // First digit of milliseconds
  
  // Extract first 3 digits from beneficiary number (the 5 digits part)
  // Pattern: B-{5digits}{3letters} -> use first 3 digits of the 5-digit number
  const beneficiaryDigits = beneficiaryName.match(/B-(\d{5})/)[1];
  const first3Digits = beneficiaryDigits.slice(0, 3);
  
  let refId = `A${year}${month}${day}${hours}${minutes}${seconds}${millisecondsFirstDigit}${first3Digits}`;
  
  // Check for collision (should be extremely rare with delays in place)
  // If collision detected, add a small random suffix (using last digit of milliseconds)
  if (usedReferenceIds.has(refId)) {
    const millisecondsLastDigit = milliseconds[2]; // Use last digit of milliseconds as fallback
    refId = `A${year}${month}${day}${hours}${minutes}${seconds}${millisecondsLastDigit}${first3Digits}`;
  }
  
  // Add to used set
  usedReferenceIds.add(refId);
  
  return refId;
};

// Generate amounts that sum to 50,000 (similar to JSON pattern)
// Using varied amounts like: 101, 110, 200, 285, 300, 400, 460, 500, 550, 964, 1000, 1300, 2000, 6000, etc.
const generateAmounts = (totalAmount = 80000) => {
  const amountTemplates = [120, 285, 150, 200, 285, 300, 340, 400, 460, 479, 500, 502, 550, 964, 1000, 1250,  1300, 1700, 1900, 2500, 2000, 6000];
  const amounts = [];
  let remaining = totalAmount;
  
  // Generate amounts until we're close to the target
  while (remaining > 0) {
    // If remaining is small, use it directly
    if (remaining < 200) {
      amounts.push(remaining);
      break;
    }
    
    // Pick a random amount from templates, but ensure it doesn't exceed remaining
    const availableAmounts = amountTemplates.filter(amt => amt <= remaining);
    if (availableAmounts.length === 0) {
      // If no template fits, use remaining amount
      amounts.push(remaining);
      break;
    }
    
    const randomAmount = availableAmounts[Math.floor(Math.random() * availableAmounts.length)];
    amounts.push(randomAmount);
    remaining -= randomAmount;
  }
  
  // Adjust last amount to ensure exact total
  const sum = amounts.reduce((a, b) => a + b, 0);
  if (sum !== totalAmount) {
    amounts[amounts.length - 1] += (totalAmount - sum);
  }
  
  return amounts;
};

// Generate all amounts
const AMOUNTS = generateAmounts(50000);

// Function to sleep/delay
const sleep = (seconds) => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

// Function to get random delay between 6-10 seconds
const getRandomDelay = () => {
  return Math.floor(Math.random() * 5) + 6; // 6-10 seconds
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
  console.log(`Total transactions: ${AMOUNTS.length}`);
  console.log(`Total amount: ₹${AMOUNTS.reduce((a, b) => a + b, 0)}`);
  console.log('==========================================\n');

  const results = [];
  const accounts = [ACCOUNT1, ACCOUNT2, ACCOUNT3, ACCOUNT4];

  for (let i = 0; i < AMOUNTS.length; i++) {
    const amount = AMOUNTS[i];
    
    // Add small delay to ensure unique timestamps (except for first transaction)
    if (i > 0) {
      await sleep(0.1); // 100ms delay to ensure different timestamps
    }
    
    // Generate beneficiary name in format: B-{5digits}{3letters}
    const beneficiaryName = generateBeneficiaryName();
    
    // Generate reference ID in format: A{YYYYMMDDHHMMSS}{milliseconds_first_digit}{first3digits}
    const refId = generateReferenceId(beneficiaryName);
    
    // Rotate between 3 accounts
    const account = accounts[i % 3];
    
    const result = await makePayout(refId, amount, account, beneficiaryName);
    results.push({ refId, amount, account: account.bank, beneficiary: beneficiaryName, ...result });
    
    // Add delay between requests (except for the last one)
    if (i < AMOUNTS.length - 1) {
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

