const mongoose = require('mongoose');
const config = require('./src/config/index');

// Connect to MongoDB
mongoose.connect(config.mongodb.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Import the PayinTransaction model
const PayinTransaction = require('./src/models/payinTransaction.model');

async function checkPayinAmount() {
  try {
    const userId = 34;
    const targetDate = '2025-08-10'; // August 10th, 2025
    
    // Create date range for the entire day (IST timezone)
    const startDate = new Date('2025-08-10T00:00:00.000+05:30'); // Start of day IST
    const endDate = new Date('2025-08-10T23:59:59.999+05:30');   // End of day IST

    console.log(`\n🔍 Checking Payin Transactions for User ID: ${userId}`);
    console.log(`📅 Date: ${targetDate} (Full Day)`);
    console.log(`⏰ Time Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log('=' .repeat(70));

    // Find all payin transactions for user 34 on August 10th, 2025
    const payinTransactions = await PayinTransaction.find({
      'user.user_id': userId,
      createdAt: { 
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ createdAt: 1 });

    console.log(`📊 Found ${payinTransactions.length} payin transactions`);

    if (payinTransactions.length === 0) {
      console.log('✅ No payin transactions found for this date.');
      return;
    }

    let totalAmount = 0;
    let totalCharges = 0;
    let totalGST = 0;
    let successfulTransactions = 0;
    let failedTransactions = 0;
    let pendingTransactions = 0;

    console.log('\n📋 Transaction Details:');
    console.log('-' .repeat(100));
    console.log('Time\t\t\tReference ID\t\tAmount\t\tCharges\t\tGST\t\tStatus\t\tTotal');
    console.log('-' .repeat(100));

    payinTransactions.forEach((transaction) => {
      const amount = parseFloat(transaction.amount || 0);
      const charges = parseFloat(transaction.charges?.total_charges || 0);
      const gst = parseFloat(transaction.gst_amount || 0);
      const total = amount + charges + gst;
      const status = transaction.status || 'unknown';

      totalAmount += amount;
      totalCharges += charges;
      totalGST += gst;

      // Count by status
      if (status === 'completed' || status === 'success') {
        successfulTransactions++;
      } else if (status === 'failed') {
        failedTransactions++;
      } else {
        pendingTransactions++;
      }

      // Format time for display
      const time = transaction.createdAt.toISOString().split('T')[1].split('.')[0];

      console.log(
        `${time}\t` +
        `${transaction.reference_id}\t\t` +
        `₹${amount.toFixed(2)}\t\t` +
        `₹${charges.toFixed(2)}\t\t` +
        `₹${gst.toFixed(2)}\t\t` +
        `${status}\t\t` +
        `₹${total.toFixed(2)}`
      );
    });

    const grandTotal = totalAmount + totalCharges + totalGST;

    console.log('-' .repeat(100));
    console.log('\n💰 SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`Total Transactions: ${payinTransactions.length}`);
    console.log(`Successful: ${successfulTransactions}`);
    console.log(`Failed: ${failedTransactions}`);
    console.log(`Pending: ${pendingTransactions}`);
    console.log('');
    console.log(`Total Amount: ₹${totalAmount.toFixed(2)}`);
    console.log(`Total Charges: ₹${totalCharges.toFixed(2)}`);
    console.log(`Total GST: ₹${totalGST.toFixed(2)}`);
    console.log(`Grand Total: ₹${grandTotal.toFixed(2)}`);
    console.log('=' .repeat(50));

    // Show successful transactions only
    const successfulPayins = payinTransactions.filter(t => 
      t.status === 'completed' || t.status === 'success'
    );
    
    if (successfulPayins.length > 0) {
      let successfulAmount = 0;
      let successfulCharges = 0;
      let successfulGST = 0;
      
      successfulPayins.forEach(t => {
        successfulAmount += parseFloat(t.amount || 0);
        successfulCharges += parseFloat(t.charges?.total_charges || 0);
        successfulGST += parseFloat(t.gst_amount || 0);
      });
      
      const successfulTotal = successfulAmount + successfulCharges + successfulGST;
      
      console.log('\n✅ SUCCESSFUL TRANSACTIONS ONLY:');
      console.log('=' .repeat(40));
      console.log(`Successful Transactions: ${successfulPayins.length}`);
      console.log(`Successful Amount: ₹${successfulAmount.toFixed(2)}`);
      console.log(`Successful Charges: ₹${successfulCharges.toFixed(2)}`);
      console.log(`Successful GST: ₹${successfulGST.toFixed(2)}`);
      console.log(`Successful Total: ₹${successfulTotal.toFixed(2)}`);
      console.log('=' .repeat(40));
    }

  } catch (error) {
    console.error('❌ Error checking payin amount:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the check
checkPayinAmount(); 