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
    
    // Create date range for July 28th to August 12th, 2025 (IST timezone)
    const startDate = new Date('2025-07-28T00:00:00.000+05:30'); // Start of July 28th IST
    const endDate = new Date('2025-08-12T23:59:59.999+05:30');   // End of August 12th IST

    console.log(`\n🔍 Checking Payin Transactions for User ID: ${userId}`);
    console.log(`📅 Date Range: July 28, 2025 to August 12, 2025`);
    console.log(`⏰ Time Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log('=' .repeat(80));

    // Find all payin transactions for user 34 in the date range
    const payinTransactions = await PayinTransaction.find({
      'user.user_id': userId,
      createdAt: { 
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ createdAt: 1 });

    console.log(`📊 Found ${payinTransactions.length} payin transactions`);

    if (payinTransactions.length === 0) {
      console.log('✅ No payin transactions found for this date range.');
      return;
    }

    let totalAmount = 0;
    let totalCharges = 0;
    let totalGST = 0;
    let successfulTransactions = 0;
    let failedTransactions = 0;
    let pendingTransactions = 0;

    // Group transactions by date
    const transactionsByDate = {};
    
    payinTransactions.forEach((transaction) => {
      const amount = parseFloat(transaction.amount || 0);
      const charges = parseFloat(transaction.charges?.total_charges || 0);
      const gst = parseFloat(transaction.gst_amount || 0);
      const total = amount + charges + gst;
      const status = transaction.status || 'unknown';
      const date = transaction.createdAt.toISOString().split('T')[0];

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

      // Group by date
      if (!transactionsByDate[date]) {
        transactionsByDate[date] = {
          total: 0,
          amount: 0,
          charges: 0,
          gst: 0,
          successful: 0,
          failed: 0,
          pending: 0,
          count: 0
        };
      }
      
      transactionsByDate[date].total += total;
      transactionsByDate[date].amount += amount;
      transactionsByDate[date].charges += charges;
      transactionsByDate[date].gst += gst;
      transactionsByDate[date].count++;
      
      if (status === 'completed' || status === 'success') {
        transactionsByDate[date].successful++;
      } else if (status === 'failed') {
        transactionsByDate[date].failed++;
      } else {
        transactionsByDate[date].pending++;
      }
    });

    const grandTotal = totalAmount + totalCharges + totalGST;

    console.log('\n📅 DAILY BREAKDOWN:');
    console.log('-' .repeat(120));
    console.log('Date\t\t\tTransactions\tSuccessful\tFailed\tPending\tAmount\t\tCharges\t\tGST\t\tTotal');
    console.log('-' .repeat(120));

    // Sort dates and display daily breakdown
    const sortedDates = Object.keys(transactionsByDate).sort();
    
    sortedDates.forEach(date => {
      const dayData = transactionsByDate[date];
      console.log(
        `${date}\t` +
        `${dayData.count}\t\t` +
        `${dayData.successful}\t\t` +
        `${dayData.failed}\t\t` +
        `${dayData.pending}\t\t` +
        `₹${dayData.amount.toFixed(2)}\t\t` +
        `₹${dayData.charges.toFixed(2)}\t\t` +
        `₹${dayData.gst.toFixed(2)}\t\t` +
        `₹${dayData.total.toFixed(2)}`
      );
    });

    console.log('-' .repeat(120));
    console.log('\n💰 OVERALL SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`Total Transactions: ${payinTransactions.length}`);
    console.log(`Successful: ${successfulTransactions}`);
    console.log(`Failed: ${failedTransactions}`);
    console.log(`Pending: ${pendingTransactions}`);
    console.log('');
    console.log(`Total Amount: ₹${totalAmount.toFixed(2)}`);
    console.log(`Total Charges: ₹${totalCharges.toFixed(2)}`);
    console.log(`Total GST: ₹${totalGST.toFixed(2)}`);
    console.log(`Grand Total: ₹${grandTotal.toFixed(2)}`);
    console.log('=' .repeat(60));

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
      console.log('=' .repeat(50));
      console.log(`Successful Transactions: ${successfulPayins.length}`);
      console.log(`Successful Amount: ₹${successfulAmount.toFixed(2)}`);
      console.log(`Successful Charges: ₹${successfulCharges.toFixed(2)}`);
      console.log(`Successful GST: ₹${successfulGST.toFixed(2)}`);
      console.log(`Successful Total: ₹${successfulTotal.toFixed(2)}`);
      console.log('=' .repeat(50));
    }

    // Show top 10 largest transactions
    console.log('\n🏆 TOP 10 LARGEST TRANSACTIONS:');
    console.log('-' .repeat(100));
    console.log('Date\t\t\tReference ID\t\tAmount\t\tCharges\t\tGST\t\tStatus\t\tTotal');
    console.log('-' .repeat(100));

    const sortedByAmount = payinTransactions
      .sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0))
      .slice(0, 10);

    sortedByAmount.forEach((transaction, index) => {
      const amount = parseFloat(transaction.amount || 0);
      const charges = parseFloat(transaction.charges?.total_charges || 0);
      const gst = parseFloat(transaction.gst_amount || 0);
      const total = amount + charges + gst;
      const status = transaction.status || 'unknown';
      const date = transaction.createdAt.toISOString().split('T')[0];

      console.log(
        `${date}\t` +
        `${transaction.reference_id}\t\t` +
        `₹${amount.toFixed(2)}\t\t` +
        `₹${charges.toFixed(2)}\t\t` +
        `₹${gst.toFixed(2)}\t\t` +
        `${status}\t\t` +
        `₹${total.toFixed(2)}`
      );
    });

  } catch (error) {
    console.error('❌ Error checking payin amount:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the check
checkPayinAmount(); 