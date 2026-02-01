const axios = require('axios');

// Configuration
const API_URL = 'https://payvex.in/api/payments/payout';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcl90eXBlIjoicGF5aW5fcGF5b3V0IiwiaWF0IjoxNzY5OTU5NzExLCJleHAiOjE4MDE0OTU3MTF9.y8Cfw2L95FmNj8bTbQrgiIyu-CYOhrtWhOqFgzqu6B4';

// Account: ICICI Bank
const ACCOUNT = {
  number: '387501504326',
  ifsc: 'ICIC0003875',
  bank: 'ICICI Bank'
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

// Function to generate reference ID in format: PAYOUT{random_numbers}
const generateReferenceId = () => {
  // Generate random 9-digit number
  const randomNumber = Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(9, '0');
  
  let refId = `PAYOUT${randomNumber}`;
  
  // Check for collision (should be extremely rare)
  // If collision detected, generate a new random number
  let attempts = 0;
  while (usedReferenceIds.has(refId) && attempts < 10) {
    const newRandomNumber = Math.floor(Math.random() * 1000000000)
      .toString()
      .padStart(9, '0');
    refId = `PAYOUT${newRandomNumber}`;
    attempts++;
  }
  
  // Add to used set
  usedReferenceIds.add(refId);
  
  return refId;
};

// Generate random amounts around 25000, 26000, 22000
// Total should sum to the specified amount
const generateAmounts = (totalAmount = 452000) => {
  // Base amounts with variation ranges
  const baseAmounts = [
    { base: 25000, min: 24000, max: 26000 },
    { base: 26000, min: 25000, max: 27000 },
    { base: 22000, min: 21000, max: 23000 }
  ];
  
  const amounts = [];
  let remaining = totalAmount;
  
  // Generate random amounts around the base values
  while (remaining > 0) {
    // If remaining is less than the minimum, use it directly
    if (remaining < 21000) {
      amounts.push(remaining);
      break;
    }
    
    // Randomly select a base amount template
    const template = baseAmounts[Math.floor(Math.random() * baseAmounts.length)];
    
    // Generate random amount within the template's range
    const minAmount = Math.max(template.min, 21000); // Ensure minimum
    const maxAmount = Math.min(template.max, remaining); // Don't exceed remaining
    
    if (maxAmount < minAmount) {
      // If no template fits, use remaining amount
      amounts.push(remaining);
      break;
    }
    
    // Generate random amount within the range
    const randomAmount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
    amounts.push(randomAmount);
    remaining -= randomAmount;
  }
  
  // Adjust last amount to ensure exact total
  const sum = amounts.reduce((a, b) => a + b, 0);
  if (sum !== totalAmount) {
    amounts[amounts.length - 1] += (totalAmount - sum);
  }
  
  // Shuffle the amounts array to randomize the order
  for (let i = amounts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
  }
  
  return amounts;
};

// Generate all amounts
const AMOUNTS = generateAmounts(452000);

// Function to sleep/delay
const sleep = (seconds) => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

// Function to get random delay between 3-4 seconds
const getRandomDelay = () => {
  return Math.floor(Math.random() * 2) + 3; // 3-4 seconds
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

  for (let i = 0; i < AMOUNTS.length; i++) {
    const amount = AMOUNTS[i];
    
    // Add small delay to ensure unique timestamps (except for first transaction)
    if (i > 0) {
      await sleep(0.1); // 100ms delay to ensure different timestamps
    }
    
    // Generate beneficiary name in format: B-{5digits}{3letters}
    const beneficiaryName = generateBeneficiaryName();
    
    // Generate reference ID in format: PAYOUT{random_numbers}
    const refId = generateReferenceId();
    
    // Use the single account
    const account = ACCOUNT;
    
    const result = await makePayout(refId, amount, account, beneficiaryName);
    results.push({ refId, amount, account: account.bank, accountNumber: account.number, accountIfsc: account.ifsc, beneficiary: beneficiaryName, ...result });
    
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
  
  // Account-wise summary
  console.log('\n\nAccount-wise Summary:');
  console.log('==========================================');
  const accountSummary = {};
  results.forEach((result) => {
    if (result.success) {
      const key = `${result.accountNumber} (${result.accountIfsc}) - ${result.account}`;
      if (!accountSummary[key]) {
        accountSummary[key] = { count: 0, total: 0 };
      }
      accountSummary[key].count += 1;
      accountSummary[key].total += result.amount;
    }
  });
  
  Object.entries(accountSummary).forEach(([account, data]) => {
    console.log(`\n${account}:`);
    console.log(`  Transactions: ${data.count}`);
    console.log(`  Total Amount: ₹${data.total}`);
  });
  console.log('==========================================');
};

// Run the script
processAllPayouts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

