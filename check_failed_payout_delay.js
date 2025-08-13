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

async function checkFailedPayoutDelay() {
  try {
    const userId = 34;
    const delayThreshold = 10; // 10 minutes in milliseconds
    const delayThresholdMs = delayThreshold * 60 * 1000;
    
    // Create date range for July 28th to August 12th, 2025 (IST timezone)
    const startDate = new Date('2025-07-28T00:00:00.000+05:30'); // Start of July 28th IST
    const endDate = new Date('2025-08-12T23:59:59.999+05:30');   // End of August 12th IST

    console.log(`\n🔍 Checking Failed Payout Transactions with >${delayThreshold} min delay for User ID: ${userId}`);
    console.log(`📅 Date Range: July 28, 2025 to August 12, 2025`);
    console.log(`⏱️  Looking for transactions with >${delayThreshold} minutes between createdAt and updatedAt`);
    console.log('=' .repeat(80));

    // Find all failed payout transactions for user 34 in the date range
    const failedTransactions = await PayoutTransaction.find({
      'user.user_id': userId,
      status: 'failed',
      createdAt: { 
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ createdAt: 1 });

    console.log(`📊 Found ${failedTransactions.length} total failed payout transactions in date range`);

    if (failedTransactions.length === 0) {
      console.log('✅ No failed payout transactions found in this date range.');
      return;
    }

    // Filter transactions with delay > 10 minutes
    const delayedFailedTransactions = [];
    let totalAmount = 0;
    let totalCharges = 0;
    let totalGST = 0;

    failedTransactions.forEach((transaction) => {
      const createdAt = new Date(transaction.createdAt);
      const updatedAt = new Date(transaction.updatedAt);
      const timeDifference = updatedAt.getTime() - createdAt.getTime();
      const timeDifferenceMinutes = timeDifference / (1000 * 60);

      if (timeDifference > delayThresholdMs) {
        const amount = parseFloat(transaction.amount || 0);
        const charges = parseFloat(transaction.charges?.total_charges || 0);
        const gst = parseFloat(transaction.gst_amount || 0);
        const total = amount + charges + gst;

        totalAmount += amount;
        totalCharges += charges;
        totalGST += gst;

        delayedFailedTransactions.push({
          transaction,
          timeDifference,
          timeDifferenceMinutes,
          amount,
          charges,
          gst,
          total
        });
      }
    });

    console.log(`🚨 Found ${delayedFailedTransactions.length} failed payout transactions with >${delayThreshold} min delay`);
    console.log(`📈 ${((delayedFailedTransactions.length / failedTransactions.length) * 100).toFixed(2)}% of failed payout transactions had delays`);

    if (delayedFailedTransactions.length === 0) {
      console.log('✅ No delayed failed payout transactions found.');
      return;
    }

    // Sort by delay time (longest first)
    delayedFailedTransactions.sort((a, b) => b.timeDifference - a.timeDifference);

    console.log('\n📋 DELAYED FAILED PAYOUT TRANSACTIONS DETAILS:');
    console.log('-' .repeat(140));
    console.log('Date\t\t\tReference ID\t\tAmount\t\tCharges\t\tGST\t\tTotal\t\tDelay (min)\tCreated\t\tUpdated');
    console.log('-' .repeat(140));

    delayedFailedTransactions.forEach((item, index) => {
      const { transaction, timeDifferenceMinutes, amount, charges, gst, total } = item;
      const date = transaction.createdAt.toISOString().split('T')[0];
      const createdTime = transaction.createdAt.toISOString().split('T')[1].split('.')[0];
      const updatedTime = transaction.updatedAt.toISOString().split('T')[1].split('.')[0];

      console.log(
        `${date}\t` +
        `${transaction.reference_id}\t\t` +
        `₹${amount.toFixed(2)}\t\t` +
        `₹${charges.toFixed(2)}\t\t` +
        `₹${gst.toFixed(2)}\t\t` +
        `₹${total.toFixed(2)}\t\t` +
        `${timeDifferenceMinutes.toFixed(1)}\t\t` +
        `${createdTime}\t` +
        `${updatedTime}`
      );
    });

    const grandTotal = totalAmount + totalCharges + totalGST;

    console.log('-' .repeat(140));
    console.log('\n💰 SUMMARY OF DELAYED FAILED PAYOUT TRANSACTIONS:');
    console.log('=' .repeat(60));
    console.log(`Total Delayed Failed Payout Transactions: ${delayedFailedTransactions.length}`);
    console.log(`Total Amount: ₹${totalAmount.toFixed(2)}`);
    console.log(`Total Charges: ₹${totalCharges.toFixed(2)}`);
    console.log(`Total GST: ₹${totalGST.toFixed(2)}`);
    console.log(`Grand Total: ₹${grandTotal.toFixed(2)}`);
    console.log('=' .repeat(60));

    // Show delay distribution
    console.log('\n⏱️  DELAY DISTRIBUTION:');
    console.log('-' .repeat(50));
    
    const delayRanges = [
      { min: 10, max: 30, label: '10-30 minutes' },
      { min: 30, max: 60, label: '30-60 minutes' },
      { min: 60, max: 120, label: '1-2 hours' },
      { min: 120, max: 1440, label: '2-24 hours' },
      { min: 1440, max: Infinity, label: '>24 hours' }
    ];

    delayRanges.forEach(range => {
      const count = delayedFailedTransactions.filter(item => 
        item.timeDifferenceMinutes >= range.min && item.timeDifferenceMinutes < range.max
      ).length;
      
      if (count > 0) {
        console.log(`${range.label}: ${count} transactions`);
      }
    });

    // Show top 10 longest delays
    console.log('\n🏆 TOP 10 LONGEST DELAYS:');
    console.log('-' .repeat(120));
    console.log('Rank\tDelay (min)\tReference ID\t\tAmount\t\tCreated\t\tUpdated');
    console.log('-' .repeat(120));

    delayedFailedTransactions.slice(0, 10).forEach((item, index) => {
      const { transaction, timeDifferenceMinutes, amount } = item;
      const createdTime = transaction.createdAt.toISOString().split('T')[1].split('.')[0];
      const updatedTime = transaction.updatedAt.toISOString().split('T')[1].split('.')[0];

      console.log(
        `${index + 1}\t` +
        `${timeDifferenceMinutes.toFixed(1)}\t\t` +
        `${transaction.reference_id}\t\t` +
        `₹${amount.toFixed(2)}\t\t` +
        `${createdTime}\t` +
        `${updatedTime}`
      );
    });

    // Show average delay
    const averageDelay = delayedFailedTransactions.reduce((sum, item) => sum + item.timeDifferenceMinutes, 0) / delayedFailedTransactions.length;
    console.log(`\n📊 Average Delay: ${averageDelay.toFixed(1)} minutes`);

    // Show daily breakdown
    console.log('\n📅 DAILY BREAKDOWN OF DELAYED FAILED PAYOUTS:');
    console.log('-' .repeat(80));
    console.log('Date\t\t\tDelayed Failed Count\tTotal Amount\t\tTotal Charges\t\tTotal GST\t\tGrand Total');
    console.log('-' .repeat(80));

    const dailyBreakdown = {};
    delayedFailedTransactions.forEach(item => {
      const date = item.transaction.createdAt.toISOString().split('T')[0];
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = {
          count: 0,
          amount: 0,
          charges: 0,
          gst: 0,
          total: 0
        };
      }
      dailyBreakdown[date].count++;
      dailyBreakdown[date].amount += item.amount;
      dailyBreakdown[date].charges += item.charges;
      dailyBreakdown[date].gst += item.gst;
      dailyBreakdown[date].total += item.total;
    });

    const sortedDates = Object.keys(dailyBreakdown).sort();
    sortedDates.forEach(date => {
      const dayData = dailyBreakdown[date];
      console.log(
        `${date}\t` +
        `${dayData.count}\t\t\t` +
        `₹${dayData.amount.toFixed(2)}\t\t` +
        `₹${dayData.charges.toFixed(2)}\t\t` +
        `₹${dayData.gst.toFixed(2)}\t\t` +
        `₹${dayData.total.toFixed(2)}`
      );
    });

  } catch (error) {
    console.error('❌ Error checking failed payout transactions delay:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the check
checkFailedPayoutDelay(); 