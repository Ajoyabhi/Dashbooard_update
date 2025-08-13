const mongoose = require('mongoose');
const config = require('./src/config/index');
const fs = require('fs');

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

async function generateExcelData() {
  try {
    const targetDate = new Date('2025-08-11T14:09:00.000+05:30'); // Aug 11, 2025, 02:09 PM IST
    const userId = 34;

    console.log(`\n🔍 Generating Excel data for User ID: ${userId}`);
    console.log(`📅 After date: ${targetDate.toISOString()}`);

    // Find all successful payout transactions for user 34 after the target date
    const successfulTransactions = await PayoutTransaction.find({
      'user.user_id': userId,
      status: 'success',
      createdAt: { $gte: targetDate }
    }).sort({ createdAt: 1 });

    console.log(`📊 Found ${successfulTransactions.length} successful payout transactions`);

    if (successfulTransactions.length === 0) {
      console.log('✅ No successful transactions found.');
      return;
    }

    // Create CSV content
    let csvContent = 'Date,Reference ID,Amount,Charges,GST Amount,Total,Created At\n';
    
    let totalAmount = 0;
    let totalCharges = 0;
    let totalGST = 0;

    successfulTransactions.forEach((transaction) => {
      const amount = parseFloat(transaction.amount || 0);
      const charges = parseFloat(transaction.charges?.total_charges || 0);
      const gst = parseFloat(transaction.gst_amount || 0);
      const total = amount + charges + gst;

      totalAmount += amount;
      totalCharges += charges;
      totalGST += gst;

      // Format date for CSV
      const date = transaction.createdAt.toISOString().split('T')[0];
      const createdAt = transaction.createdAt.toISOString();

      csvContent += `${date},"${transaction.reference_id}",${amount.toFixed(2)},${charges.toFixed(2)},${gst.toFixed(2)},${total.toFixed(2)},"${createdAt}"\n`;
    });

    // Add summary row
    const grandTotal = totalAmount + totalCharges + totalGST;
    csvContent += `\nSUMMARY,,,,,\n`;
    csvContent += `Total Transactions,${successfulTransactions.length},,,,\n`;
    csvContent += `Total Amount,,${totalAmount.toFixed(2)},,,\n`;
    csvContent += `Total Charges,,,${totalCharges.toFixed(2)},,\n`;
    csvContent += `Total GST,,,,${totalGST.toFixed(2)},\n`;
    csvContent += `Grand Total,,,,,${grandTotal.toFixed(2)}\n`;

    // Save to CSV file (Excel can open CSV files)
    const filename = `settlement_correction_user_${userId}_${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(filename, csvContent);

    console.log(`\n📄 Excel/CSV file generated: ${filename}`);
    console.log(`💰 SUMMARY:`);
    console.log(`Total Transactions: ${successfulTransactions.length}`);
    console.log(`Total Amount: ₹${totalAmount.toFixed(2)}`);
    console.log(`Total Charges: ₹${totalCharges.toFixed(2)}`);
    console.log(`Total GST: ₹${totalGST.toFixed(2)}`);
    console.log(`Grand Total: ₹${grandTotal.toFixed(2)}`);

    // Also create a detailed JSON file for reference
    const jsonFilename = `settlement_correction_user_${userId}_${new Date().toISOString().split('T')[0]}.json`;
    const jsonData = {
      user_id: userId,
      target_date: targetDate.toISOString(),
      summary: {
        total_transactions: successfulTransactions.length,
        total_amount: totalAmount,
        total_charges: totalCharges,
        total_gst: totalGST,
        grand_total: grandTotal
      },
      transactions: successfulTransactions.map(t => ({
        reference_id: t.reference_id,
        amount: t.amount,
        charges: t.charges,
        gst_amount: t.gst_amount,
        created_at: t.createdAt,
        status: t.status
      }))
    };
    
    fs.writeFileSync(jsonFilename, JSON.stringify(jsonData, null, 2));
    console.log(`📄 JSON file generated: ${jsonFilename}`);

  } catch (error) {
    console.error('❌ Error generating Excel data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the generation
generateExcelData(); 