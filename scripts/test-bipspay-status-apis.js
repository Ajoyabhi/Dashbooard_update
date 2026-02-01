const axios = require('axios');

// Configuration
const BIPSPAY_BASE_URL = 'https://gateway.bipspay.com';
const AUTH_CREDENTIALS = {
  user_name: "Velocis",
  password: "Velocis_2026@"
};

// Token cache
let cachedBipspayToken = null;
let tokenExpiry = null;

/**
 * Get BipsPay authentication token
 * Uses caching to avoid unnecessary API calls
 */
const getBipspayToken = async () => {
  const now = Date.now();
  if (cachedBipspayToken && tokenExpiry && now < tokenExpiry) {
    console.log('✓ Using cached token');
    return cachedBipspayToken;
  }

  try {
    console.log('🔄 Fetching new BipsPay token...');
    const response = await axios.post(`${BIPSPAY_BASE_URL}/auth/token`, AUTH_CREDENTIALS, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.token) {
      cachedBipspayToken = response.data.token;
      // Expire 2 minutes early to be safe (28 minutes)
      tokenExpiry = now + (28 * 60 * 1000);
      console.log('✓ Token obtained successfully');
      return cachedBipspayToken;
    } else {
      throw new Error('Failed to get BipsPay token: No token in response');
    }
  } catch (error) {
    console.error('❌ Token Generation Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};

/**
 * Test Payin Order Status API
 */
const testPayinOrderStatus = async (referenceNumber) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📥 Testing Payin Order Status API');
    console.log('='.repeat(60));
    
    const token = await getBipspayToken();
    
    console.log(`\n📋 Request Details:`);
    console.log(`   Endpoint: ${BIPSPAY_BASE_URL}/api/v6/payinOrderStatus`);
    console.log(`   Method: POST`);
    console.log(`   Reference Number: ${referenceNumber}`);
    
    const requestBody = {
      referenceNumber: referenceNumber
    };

    const startTime = Date.now();
    const response = await axios.post(
      `${BIPSPAY_BASE_URL}/api/v6/payinOrderStatus`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const responseTime = Date.now() - startTime;

    console.log(`\n✅ Response received (${responseTime}ms)`);
    console.log(`   Status Code: ${response.status}`);
    
    const result = response.data;
    
    console.log(`\n📦 Response Body:`);
    console.log(JSON.stringify(result, null, 2));

    // Evaluate response
    console.log(`\n🔍 Response Evaluation:`);
    
    const evaluation = {
      success: response.status === 200,
      hasData: !!result,
      hasStatus: !!(result?.status || result?.data?.status || result?.result?.status),
      hasAmount: !!(result?.amount || result?.data?.amount || result?.result?.amount),
      hasReference: !!(result?.referenceNumber || result?.data?.referenceNumber || result?.result?.referenceNumber),
      hasBankRef: !!(result?.bank_ref || result?.data?.bank_ref || result?.result?.bank_ref),
      responseTime: responseTime,
      statusCode: response.status
    };

    // Display evaluation results
    console.log(`   ✓ HTTP Status: ${evaluation.success ? 'SUCCESS' : 'FAILED'} (${evaluation.statusCode})`);
    console.log(`   ${evaluation.hasData ? '✓' : '✗'} Has Response Data: ${evaluation.hasData}`);
    console.log(`   ${evaluation.hasStatus ? '✓' : '✗'} Has Status Field: ${evaluation.hasStatus}`);
    console.log(`   ${evaluation.hasAmount ? '✓' : '✗'} Has Amount Field: ${evaluation.hasAmount}`);
    console.log(`   ${evaluation.hasReference ? '✓' : '✗'} Has Reference Number: ${evaluation.hasReference}`);
    console.log(`   ${evaluation.hasBankRef ? '✓' : '✗'} Has Bank Reference/UTR: ${evaluation.hasBankRef}`);
    console.log(`   ⏱️  Response Time: ${evaluation.responseTime}ms`);

    // Extract transaction status if available
    let transactionStatus = 'unknown';
    if (result?.status) transactionStatus = result.status;
    else if (result?.data?.status) transactionStatus = result.data.status;
    else if (result?.result?.status) transactionStatus = result.result.status;

    if (transactionStatus !== 'unknown') {
      console.log(`\n📊 Transaction Status: ${transactionStatus}`);
    }

    // Extract amount if available
    const amount = result?.amount || result?.data?.amount || result?.result?.amount;
    if (amount) {
      console.log(`💰 Transaction Amount: ${amount}`);
    }

    // Extract bank reference/UTR if available
    const bankRef = result?.bank_ref || result?.data?.bank_ref || result?.result?.bank_ref;
    if (bankRef) {
      console.log(`🏦 Bank Reference/UTR: ${bankRef}`);
    }

    return {
      success: true,
      evaluation,
      response: result,
      transactionStatus,
      amount,
      bankRef
    };

  } catch (error) {
    console.error('\n❌ Payin Order Status API Error:');
    console.error(`   Error Message: ${error.message}`);
    
    if (error.response) {
      console.error(`   HTTP Status: ${error.response.status}`);
      console.error(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error(`   No response received. Request details:`, error.request);
    }
    
    return {
      success: false,
      error: error.message,
      statusCode: error.response?.status,
      responseData: error.response?.data
    };
  }
};

/**
 * Test Payout Order Status API
 */
const testPayoutOrderStatus = async (referenceNumber) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📤 Testing Payout Order Status API');
    console.log('='.repeat(60));
    
    const token = await getBipspayToken();
    
    console.log(`\n📋 Request Details:`);
    console.log(`   Endpoint: ${BIPSPAY_BASE_URL}/api/v6/payoutOrderStatus`);
    console.log(`   Method: POST`);
    console.log(`   Reference Number: ${referenceNumber}`);
    
    const requestBody = {
      referenceNumber: referenceNumber
    };

    const startTime = Date.now();
    const response = await axios.post(
      `${BIPSPAY_BASE_URL}/api/v6/payoutOrderStatus`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const responseTime = Date.now() - startTime;

    console.log(`\n✅ Response received (${responseTime}ms)`);
    console.log(`   Status Code: ${response.status}`);
    
    const result = response.data;
    
    console.log(`\n📦 Response Body:`);
    console.log(JSON.stringify(result, null, 2));

    // Evaluate response
    console.log(`\n🔍 Response Evaluation:`);
    
    const evaluation = {
      success: response.status === 200,
      hasData: !!result,
      hasStatus: !!(result?.status || result?.data?.status || result?.result?.status),
      hasAmount: !!(result?.amount || result?.data?.amount || result?.result?.amount),
      hasReference: !!(result?.referenceNumber || result?.data?.referenceNumber || result?.result?.referenceNumber),
      hasBankRef: !!(result?.bank_ref || result?.data?.bank_ref || result?.result?.bank_ref),
      responseTime: responseTime,
      statusCode: response.status
    };

    // Display evaluation results
    console.log(`   ✓ HTTP Status: ${evaluation.success ? 'SUCCESS' : 'FAILED'} (${evaluation.statusCode})`);
    console.log(`   ${evaluation.hasData ? '✓' : '✗'} Has Response Data: ${evaluation.hasData}`);
    console.log(`   ${evaluation.hasStatus ? '✓' : '✗'} Has Status Field: ${evaluation.hasStatus}`);
    console.log(`   ${evaluation.hasAmount ? '✓' : '✗'} Has Amount Field: ${evaluation.hasAmount}`);
    console.log(`   ${evaluation.hasReference ? '✓' : '✗'} Has Reference Number: ${evaluation.hasReference}`);
    console.log(`   ${evaluation.hasBankRef ? '✓' : '✗'} Has Bank Reference/UTR: ${evaluation.hasBankRef}`);
    console.log(`   ⏱️  Response Time: ${evaluation.responseTime}ms`);

    // Extract transaction status if available
    let transactionStatus = 'unknown';
    if (result?.status) transactionStatus = result.status;
    else if (result?.data?.status) transactionStatus = result.data.status;
    else if (result?.result?.status) transactionStatus = result.result.status;

    if (transactionStatus !== 'unknown') {
      console.log(`\n📊 Transaction Status: ${transactionStatus}`);
    }

    // Extract amount if available
    const amount = result?.amount || result?.data?.amount || result?.result?.amount;
    if (amount) {
      console.log(`💰 Transaction Amount: ${amount}`);
    }

    // Extract bank reference/UTR if available
    const bankRef = result?.bank_ref || result?.data?.bank_ref || result?.result?.bank_ref;
    if (bankRef) {
      console.log(`🏦 Bank Reference/UTR: ${bankRef}`);
    }

    return {
      success: true,
      evaluation,
      response: result,
      transactionStatus,
      amount,
      bankRef
    };

  } catch (error) {
    console.error('\n❌ Payout Order Status API Error:');
    console.error(`   Error Message: ${error.message}`);
    
    if (error.response) {
      console.error(`   HTTP Status: ${error.response.status}`);
      console.error(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error(`   No response received. Request details:`, error.request);
    }
    
    return {
      success: false,
      error: error.message,
      statusCode: error.response?.status,
      responseData: error.response?.data
    };
  }
};

/**
 * Main function to run all tests
 */
const runTests = async () => {
  console.log('\n' + '🚀'.repeat(30));
  console.log('BipsPay Transaction Status API Test Suite');
  console.log('🚀'.repeat(30));

  // Get reference numbers from command line arguments
  const args = process.argv.slice(2);
  
  let payinReference = args[0] || 'payinref123';
  let payoutReference = args[1] || 'payoutref123';

  console.log(`\n📝 Test Configuration:`);
  console.log(`   Payin Reference: ${payinReference}`);
  console.log(`   Payout Reference: ${payoutReference}`);
  console.log(`\n💡 Tip: You can pass custom reference numbers as arguments:`);
  console.log(`   node test-bipspay-status-apis.js <payin_ref> <payout_ref>`);

  const results = {
    payin: null,
    payout: null
  };

  // Test Payin Order Status
  results.payin = await testPayinOrderStatus(payinReference);

  // Test Payout Order Status
  results.payout = await testPayoutOrderStatus(payoutReference);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n📥 Payin Order Status:`);
  if (results.payin.success) {
    console.log(`   ✅ API Call: SUCCESS`);
    console.log(`   Status Code: ${results.payin.evaluation.statusCode}`);
    console.log(`   Response Time: ${results.payin.evaluation.responseTime}ms`);
    if (results.payin.transactionStatus) {
      console.log(`   Transaction Status: ${results.payin.transactionStatus}`);
    }
  } else {
    console.log(`   ❌ API Call: FAILED`);
    console.log(`   Error: ${results.payin.error}`);
    if (results.payin.statusCode) {
      console.log(`   Status Code: ${results.payin.statusCode}`);
    }
  }

  console.log(`\n📤 Payout Order Status:`);
  if (results.payout.success) {
    console.log(`   ✅ API Call: SUCCESS`);
    console.log(`   Status Code: ${results.payout.evaluation.statusCode}`);
    console.log(`   Response Time: ${results.payout.evaluation.responseTime}ms`);
    if (results.payout.transactionStatus) {
      console.log(`   Transaction Status: ${results.payout.transactionStatus}`);
    }
  } else {
    console.log(`   ❌ API Call: FAILED`);
    console.log(`   Error: ${results.payout.error}`);
    if (results.payout.statusCode) {
      console.log(`   Status Code: ${results.payout.statusCode}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Test Suite Completed');
  console.log('='.repeat(60) + '\n');

  // Exit with appropriate code
  const allPassed = results.payin.success && results.payout.success;
  process.exit(allPassed ? 0 : 1);
};

// Run tests if script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('\n💥 Fatal Error:', error);
    process.exit(1);
  });
}

module.exports = {
  getBipspayToken,
  testPayinOrderStatus,
  testPayoutOrderStatus,
  runTests
};

