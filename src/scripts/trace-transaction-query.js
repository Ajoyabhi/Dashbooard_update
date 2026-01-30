/**
 * MongoDB Query to trace transaction: TXN20260130B83AB552
 * 
 * Run this query in MongoDB shell or Compass:
 * 
 * db.apilogs.find({
 *   $or: [
 *     { message: { $regex: "TXN20260130B83AB552", $options: "i" } },
 *     { "metadata.reference_id": "TXN20260130B83AB552" },
 *     { "metadata.apitxnid": "TXN20260130B83AB552" },
 *     { "metadata.reference": "TXN20260130B83AB552" },
 *     { "metadata.txn_id": "TXN20260130B83AB552" },
 *     { "metadata.transactionId": "TXN20260130B83AB552" },
 *     { "metadata.data.reference_id": "TXN20260130B83AB552" },
 *     { "metadata.data.apitxnid": "TXN20260130B83AB552" },
 *     { "metadata.data.reference": "TXN20260130B83AB552" }
 *   ]
 * }).sort({ timestamp: 1 }).pretty()
 */

const mongoose = require('mongoose');
const config = require('../config/index');
const Apilogs = require('../models/apiLogs.model');

// Connect to MongoDB
mongoose.connect(config.mongodb.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    const transactionId = 'TXN20260130B83AB552';
    
    try {
      // Search for the transaction ID in message and metadata fields
      const logs = await Apilogs.find({
        $or: [
          { message: { $regex: transactionId, $options: 'i' } },
          { 'metadata.reference_id': transactionId },
          { 'metadata.apitxnid': transactionId },
          { 'metadata.reference': transactionId },
          { 'metadata.txn_id': transactionId },
          { 'metadata.transactionId': transactionId },
          { 'metadata.data.reference_id': transactionId },
          { 'metadata.data.apitxnid': transactionId },
          { 'metadata.data.reference': transactionId },
          { 'metadata.data.data.reference_id': transactionId },
          { 'metadata.data.data.apitxnid': transactionId }
        ]
      })
      .sort({ timestamp: 1 })
      .lean();
      
      if (logs.length === 0) {
        console.log(`❌ No logs found for transaction ID: ${transactionId}\n`);
        console.log('💡 Try searching with partial ID or check if the transaction ID is correct.\n');
        process.exit(0);
      }
      
      console.log(`📊 TRANSACTION TRACE REPORT`);
      console.log(`═══════════════════════════════════════════════════════════════`);
      console.log(`Transaction ID: ${transactionId}`);
      console.log(`Total logs found: ${logs.length}`);
      console.log(`═══════════════════════════════════════════════════════════════\n`);
      
      // Categorize logs by stage
      const intentLinkLogs = [];
      const callbackReceivedLogs = [];
      const workerProcessedLogs = [];
      const otherLogs = [];
      
      logs.forEach(log => {
        const message = log.message || '';
        const metadata = log.metadata || {};
        const lowerMessage = message.toLowerCase();
        
        // Check for intent link generation (payment.service.js:354-357)
        if (lowerMessage.includes('updating transaction status to completed') || 
            lowerMessage.includes('debug: updating transaction status') ||
            lowerMessage.includes('intent link generated') ||
            lowerMessage.includes('payin response') ||
            lowerMessage.includes('bipspay payin') ||
            (metadata.method && metadata.method === 'POST' && metadata.endpoint && metadata.endpoint.includes('payin'))) {
          intentLinkLogs.push(log);
        }
        // Check for callback received in controller (payment.controller.js:582-585)
        else if (lowerMessage.includes('received bipspay payin callback') ||
                 lowerMessage.includes('received bipspay payout callback') ||
                 lowerMessage.includes('callback received') ||
                 (metadata.method && metadata.endpoint && metadata.endpoint.includes('callback'))) {
          callbackReceivedLogs.push(log);
        }
        // Check for worker processing (callback.worker.js:795-800)
        else if (lowerMessage.includes('callback processed successfully') ||
                 lowerMessage.includes('bipspay: callback processed successfully') ||
                 lowerMessage.includes('payout transaction updated') ||
                 lowerMessage.includes('payin transaction updated') ||
                 lowerMessage.includes('merchant callback sent')) {
          workerProcessedLogs.push(log);
        }
        else {
          otherLogs.push(log);
        }
      });
      
      // Print Intent Link Generation Stage
      if (intentLinkLogs.length > 0) {
        console.log('🔗 STAGE 1: INTENT LINK GENERATION');
        console.log('   (payment.service.js:354-357 - First place transaction is considered)');
        console.log('─────────────────────────────────────────────────────────────');
        intentLinkLogs.forEach((log, index) => {
          const timestamp = log.timestamp ? new Date(log.timestamp).toISOString() : 'N/A';
          console.log(`\n   [${index + 1}] ${timestamp}`);
          console.log(`   Level: ${log.level}`);
          console.log(`   Message: ${log.message}`);
          if (log.metadata && Object.keys(log.metadata).length > 0) {
            console.log(`   Metadata:`);
            console.log(JSON.stringify(log.metadata, null, 6));
          }
        });
        console.log('\n');
      } else {
        console.log('⚠️  STAGE 1: INTENT LINK GENERATION - No logs found\n');
      }
      
      // Print Callback Received Stage
      if (callbackReceivedLogs.length > 0) {
        console.log('📥 STAGE 2: CALLBACK RECEIVED IN CONTROLLER');
        console.log('   (payment.controller.js:582-585 - Controller receives callback)');
        console.log('─────────────────────────────────────────────────────────────');
        callbackReceivedLogs.forEach((log, index) => {
          const timestamp = log.timestamp ? new Date(log.timestamp).toISOString() : 'N/A';
          console.log(`\n   [${index + 1}] ${timestamp}`);
          console.log(`   Level: ${log.level}`);
          console.log(`   Message: ${log.message}`);
          if (log.metadata && Object.keys(log.metadata).length > 0) {
            console.log(`   Metadata:`);
            console.log(JSON.stringify(log.metadata, null, 6));
          }
        });
        console.log('\n');
      } else {
        console.log('⚠️  STAGE 2: CALLBACK RECEIVED - No logs found\n');
      }
      
      // Print Worker Processing Stage
      if (workerProcessedLogs.length > 0) {
        console.log('⚙️  STAGE 3: WORKER PROCESSED & CALLBACK SENT');
        console.log('   (callback.worker.js:795-800 - Worker successfully processed)');
        console.log('─────────────────────────────────────────────────────────────');
        workerProcessedLogs.forEach((log, index) => {
          const timestamp = log.timestamp ? new Date(log.timestamp).toISOString() : 'N/A';
          console.log(`\n   [${index + 1}] ${timestamp}`);
          console.log(`   Level: ${log.level}`);
          console.log(`   Message: ${log.message}`);
          if (log.metadata && Object.keys(log.metadata).length > 0) {
            console.log(`   Metadata:`);
            console.log(JSON.stringify(log.metadata, null, 6));
          }
        });
        console.log('\n');
      } else {
        console.log('⚠️  STAGE 3: WORKER PROCESSED - No logs found\n');
      }
      
      // Print Other Related Logs
      if (otherLogs.length > 0) {
        console.log('📋 OTHER RELATED LOGS');
        console.log('─────────────────────────────────────────────────────────────');
        otherLogs.forEach((log, index) => {
          const timestamp = log.timestamp ? new Date(log.timestamp).toISOString() : 'N/A';
          console.log(`\n   [${index + 1}] ${timestamp}`);
          console.log(`   Level: ${log.level}`);
          console.log(`   Message: ${log.message}`);
          if (log.metadata && Object.keys(log.metadata).length > 0) {
            console.log(`   Metadata:`);
            console.log(JSON.stringify(log.metadata, null, 6));
          }
        });
        console.log('\n');
      }
      
      // Timeline Summary
      console.log('⏱️  TIMELINE SUMMARY');
      console.log('─────────────────────────────────────────────────────────────');
      if (intentLinkLogs.length > 0) {
        const firstIntent = intentLinkLogs[0];
        const intentTime = firstIntent.timestamp ? new Date(firstIntent.timestamp).toISOString() : 'N/A';
        console.log(`✅ Intent Link Generated: ${intentTime}`);
      } else {
        console.log(`❌ Intent Link Generated: NOT FOUND`);
      }
      
      if (callbackReceivedLogs.length > 0) {
        const firstCallback = callbackReceivedLogs[0];
        const callbackTime = firstCallback.timestamp ? new Date(firstCallback.timestamp).toISOString() : 'N/A';
        console.log(`✅ Callback Received:     ${callbackTime}`);
        if (intentLinkLogs.length > 0 && firstCallback.timestamp && intentLinkLogs[0].timestamp) {
          const timeDiff = new Date(firstCallback.timestamp) - new Date(intentLinkLogs[0].timestamp);
          const seconds = Math.round(timeDiff / 1000);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          console.log(`   ⏱️  Time Difference:      ${minutes}m ${remainingSeconds}s (${seconds} seconds)`);
        }
      } else {
        console.log(`❌ Callback Received:     NOT FOUND`);
      }
      
      if (workerProcessedLogs.length > 0) {
        const firstWorker = workerProcessedLogs[0];
        const workerTime = firstWorker.timestamp ? new Date(firstWorker.timestamp).toISOString() : 'N/A';
        console.log(`✅ Worker Processed:      ${workerTime}`);
        if (callbackReceivedLogs.length > 0 && firstWorker.timestamp && callbackReceivedLogs[0].timestamp) {
          const timeDiff = new Date(firstWorker.timestamp) - new Date(callbackReceivedLogs[0].timestamp);
          const seconds = Math.round(timeDiff / 1000);
          const milliseconds = timeDiff % 1000;
          console.log(`   ⏱️  Processing Time:       ${seconds}.${milliseconds}s`);
        }
      } else {
        console.log(`❌ Worker Processed:      NOT FOUND`);
      }
      
      // Status Summary
      console.log('\n📈 STATUS SUMMARY');
      console.log('─────────────────────────────────────────────────────────────');
      const hasIntent = intentLinkLogs.length > 0;
      const hasCallback = callbackReceivedLogs.length > 0;
      const hasWorker = workerProcessedLogs.length > 0;
      
      if (hasIntent && hasCallback && hasWorker) {
        console.log('✅ Transaction flow is COMPLETE');
        console.log('   ✓ Intent link generated');
        console.log('   ✓ Callback received');
        console.log('   ✓ Worker processed successfully');
      } else {
        console.log('⚠️  Transaction flow is INCOMPLETE');
        if (!hasIntent) console.log('   ✗ Intent link generation not found');
        if (!hasCallback) console.log('   ✗ Callback reception not found');
        if (!hasWorker) console.log('   ✗ Worker processing not found');
      }
      
      console.log('\n═══════════════════════════════════════════════════════════════\n');
      
    } catch (error) {
      console.error('❌ Error querying logs:', error);
      console.error(error.stack);
    } finally {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('\n💡 If running from a different network, try:');
    console.error('   1. Run this script on the server where MongoDB is accessible');
    console.error('   2. Or use MongoDB Compass/Shell with the connection string');
    console.error('   3. Or whitelist your IP in MongoDB Atlas\n');
    process.exit(1);
  });

