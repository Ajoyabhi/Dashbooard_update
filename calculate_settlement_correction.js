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

// Import the PayoutTransaction model
const PayoutTransaction = require('./src/models/payoutTransaction.model');

async function calculateSettlementCorrection() {
  try {
    const targetDate = new Date('2025-08-12T14:09:00.000+05:30'); // Aug 12, 2025, 2:09 PM IST
    const userId = 17;

    console.log(`\n🔍 Calculating settlement correction for User ID: ${userId}`);
    console.log(`📅 After date: ${targetDate.toISOString()}`);
    console.log('=' .repeat(60));

    // Find all successful payout transactions for user 34 after the target date
    const successfulTransactions = await PayoutTransaction.find({
      'user.user_id': userId,
      status: 'success',
      createdAt: { $gte: targetDate }
    }).sort({ createdAt: 1 });

    console.log(`📊 Found ${successfulTransactions.length} successful payout transactions`);

    if (successfulTransactions.length === 0) {
      console.log('✅ No successful transactions found. No correction needed.');
      return;
    }

    let totalAmount = 0;
    let totalCharges = 0;
    let totalGST = 0;
    let transactionCount = 0;

    console.log('\n📋 Transaction Details:');
    console.log('-' .repeat(80));
    console.log('Date\t\t\tReference ID\t\tAmount\t\tCharges\t\tGST\t\tTotal');
    console.log('-' .repeat(80));

    successfulTransactions.forEach((transaction, index) => {
      const amount = parseFloat(transaction.amount || 0);
      const charges = parseFloat(transaction.charges?.total_charges || 0);
      const gst = parseFloat(transaction.gst_amount || 0);
      const total = amount + charges + gst;

      totalAmount += amount;
      totalCharges += charges;
      totalGST += gst;
      transactionCount++;

      console.log(
        `${transaction.createdAt.toISOString().split('T')[0]}\t` +
        `${transaction.reference_id}\t` +
        `₹${amount.toFixed(2)}\t\t` +
        `₹${charges.toFixed(2)}\t\t` +
        `₹${gst.toFixed(2)}\t\t` +
        `₹${total.toFixed(2)}`
      );
    });

    const grandTotal = totalAmount + totalCharges + totalGST;

    console.log('-' .repeat(80));
    console.log('\n💰 SUMMARY:');
    console.log('=' .repeat(40));
    console.log(`Total Transactions: ${transactionCount}`);
    console.log(`Total Amount: ₹${totalAmount.toFixed(2)}`);
    console.log(`Total Charges: ₹${totalCharges.toFixed(2)}`);
    console.log(`Total GST: ₹${totalGST.toFixed(2)}`);
    console.log(`Grand Total to Subtract: ₹${grandTotal.toFixed(2)}`);
    console.log('=' .repeat(40));

    console.log('\n⚠️  ACTION REQUIRED:');
    console.log(`Subtract ₹${grandTotal.toFixed(2)} from User ID ${userId}'s settlement wallet`);
    console.log('\n📝 SQL Query to execute:');
    console.log(`UPDATE financial_details SET settlement = settlement - ${grandTotal.toFixed(2)} WHERE user_id = ${userId};`);

    // Also show the transactions in JSON format for verification
    console.log('\n📄 Transaction Details (JSON):');
    console.log(JSON.stringify(successfulTransactions.map(t => ({
      reference_id: t.reference_id,
      amount: t.amount,
      charges: t.charges,
      created_at: t.createdAt,
      status: t.status
    })), null, 2));

  } catch (error) {
    console.error('❌ Error calculating settlement correction:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the calculation
calculateSettlementCorrection(); 