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
    const transactionUuid = '3ff927bc-c4c1-4baf-95a0-5b3468bf8a8d'; // From initial log
    
    try {
      // First, find the initial log to get the transaction UUID
      const initialLog = await Apilogs.findOne({
        $or: [
          { message: { $regex: transactionId, $options: 'i' } },
          { 'metadata.reference_id': transactionId }
        ]
      })
      .sort({ timestamp: 1 })
      .lean();
      
      // Extract transaction_id from initial log if found
      let foundTransactionUuid = transactionUuid;
      if (initialLog && initialLog.metadata && initialLog.metadata.transaction_id) {
        foundTransactionUuid = initialLog.metadata.transaction_id;
      }
      if (initialLog && initialLog.metadata && initialLog.metadata.data && initialLog.metadata.data.transaction_id) {
        foundTransactionUuid = initialLog.metadata.data.transaction_id;
      }
      
      // Search for the transaction ID in message and metadata fields
      // Also search by transaction UUID and time range
      const timeRange = initialLog ? {
        $gte: new Date(new Date(initialLog.timestamp).getTime() - 5 * 60 * 1000), // 5 minutes before
        $lte: new Date(new Date(initialLog.timestamp).getTime() + 30 * 60 * 1000) // 30 minutes after
      } : {};
      
      // First search: by transaction ID
      let logs = await Apilogs.find({
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
          { 'metadata.data.data.apitxnid': transactionId },
          // Search by transaction UUID
          { 'metadata.transaction_id': foundTransactionUuid },
          { 'metadata.data.transaction_id': foundTransactionUuid }
        ]
      })
      .sort({ timestamp: 1 })
      .lean();
      
      // Second search: by time range and common patterns (if we have a time range)
      if (Object.keys(timeRange).length > 0 && logs.length > 0) {
        const timeBasedLogs = await Apilogs.find({
          timestamp: timeRange,
          $or: [
            { message: { $regex: 'updating transaction status|debug.*transaction|bipspay.*callback|received.*callback|received bipspay', $options: 'i' } },
            { 'metadata.reference_id': { $exists: true } },
            { 'metadata.apitxnid': { $exists: true } },
            { 'metadata.data.reference_id': { $exists: true } },
            { 'metadata.data.apitxnid': { $exists: true } },
            // Search for callback-specific patterns
            { message: { $regex: 'callback', $options: 'i' }, 'metadata.method': { $exists: true } }
          ]
        })
        .sort({ timestamp: 1 })
        .lean();
        
        // Merge and deduplicate by _id
        const logIds = new Set(logs.map(l => l._id.toString()));
        timeBasedLogs.forEach(log => {
          if (!logIds.has(log._id.toString())) {
            // Check if it might be related (has similar reference_id or apitxnid in nested data)
            const logRefId = log.metadata?.reference_id || log.metadata?.data?.reference_id || log.metadata?.data?.data?.reference_id;
            const logApitxnid = log.metadata?.apitxnid || log.metadata?.data?.apitxnid || log.metadata?.data?.data?.apitxnid;
            if (logRefId === transactionId || logApitxnid === transactionId || 
                log.message?.toLowerCase().includes(transactionId.toLowerCase())) {
              logs.push(log);
              logIds.add(log._id.toString());
            }
          }
        });
        
        // Sort again after merging
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }
      
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
      const initialRequestLogs = [];
      const intentLinkLogs = [];
      const callbackReceivedLogs = [];
      const workerProcessedLogs = [];
      const otherLogs = [];
      
      logs.forEach(log => {
        const message = log.message || '';
        const metadata = log.metadata || {};
        const lowerMessage = message.toLowerCase();
        
        // Check for initial payin request (payment.service.js:61)
        if (lowerMessage.includes('starting to process payin request') ||
            lowerMessage.includes('starting to process payout request') ||
            (metadata.data && metadata.data.reference_id === transactionId && lowerMessage.includes('starting'))) {
          initialRequestLogs.push(log);
        }
        // Check for intent link generation (payment.service.js:354-357)
        else if (lowerMessage.includes('updating transaction status') || 
            lowerMessage.includes('debug: updating transaction status') ||
            lowerMessage.includes('intent link generated') ||
            lowerMessage.includes('payin response') ||
            lowerMessage.includes('payment processing completed') ||
            (lowerMessage.includes('bipspay payin') && !lowerMessage.includes('callback') && !lowerMessage.includes('starting')) ||
            (metadata.reference_id === transactionId && (lowerMessage.includes('debug') || lowerMessage.includes('completed'))) ||
            (metadata.method && metadata.method === 'POST' && metadata.endpoint && metadata.endpoint.includes('payin') && !metadata.endpoint.includes('callback'))) {
          intentLinkLogs.push(log);
        }
        // Check for callback received in controller (payment.controller.js:582-585)
        // This should be a specific log message, not the initial request
        else if (lowerMessage.includes('received bipspay payin callback') ||
                 lowerMessage.includes('received bipspay payout callback') ||
                 (lowerMessage.includes('bipspay') && lowerMessage.includes('callback') && lowerMessage.includes('received')) ||
                 // Check if metadata has callback-specific structure (method + data with reference_id/apitxnid)
                 (metadata.method && (metadata.method === 'POST' || metadata.method === 'GET') && 
                  metadata.data && 
                  (metadata.data.reference_id === transactionId || 
                   metadata.data.apitxnid === transactionId ||
                   metadata.data.reference === transactionId ||
                   (typeof metadata.data === 'object' && 
                    (metadata.data.reference_id || metadata.data.apitxnid || metadata.data.reference) &&
                    !metadata.data.transaction_id)))) { // Exclude initial request which has transaction_id
          callbackReceivedLogs.push(log);
        }
        // Check for worker processing (callback.worker.js:795-800)
        else if (lowerMessage.includes('callback processed successfully') ||
                 lowerMessage.includes('bipspay: callback processed successfully') ||
                 lowerMessage.includes('payout transaction updated') ||
                 lowerMessage.includes('payin transaction updated') ||
                 lowerMessage.includes('merchant callback sent') ||
                 lowerMessage.includes('callback sent successfully') ||
                 lowerMessage.includes('starting database lookups') ||
                 lowerMessage.includes('database lookups completed') ||
                 lowerMessage.includes('transaction lookup results') ||
                 lowerMessage.includes('updated wallet balance') ||
                 lowerMessage.includes('starting transaction updates') ||
                 lowerMessage.includes('transaction updates completed') ||
                 lowerMessage.includes('starting callback attempt')) {
          workerProcessedLogs.push(log);
        }
        else {
          otherLogs.push(log);
        }
      });
      
      // Print Initial Request Stage
      if (initialRequestLogs.length > 0) {
        console.log('🚀 STAGE 0: INITIAL PAYIN REQUEST');
        console.log('   (payment.service.js:61 - Initial request received)');
        console.log('─────────────────────────────────────────────────────────────');
        initialRequestLogs.forEach((log, index) => {
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
      
      // Show ALL logs for debugging
      console.log('🔍 ALL LOGS (Full Details for Debugging)');
      console.log('─────────────────────────────────────────────────────────────');
      logs.forEach((log, index) => {
        const timestamp = log.timestamp ? new Date(log.timestamp).toISOString() : 'N/A';
        console.log(`\n[${index + 1}] ${timestamp} | Level: ${log.level}`);
        console.log(`   Message: ${log.message}`);
        if (log.metadata && Object.keys(log.metadata).length > 0) {
          console.log(`   Full Metadata:`);
          console.log(JSON.stringify(log.metadata, null, 4));
        }
      });
      console.log('\n');
      
      // Timeline Summary
      console.log('⏱️  TIMELINE SUMMARY');
      console.log('─────────────────────────────────────────────────────────────');
      if (initialRequestLogs.length > 0) {
        const firstRequest = initialRequestLogs[0];
        const requestTime = firstRequest.timestamp ? new Date(firstRequest.timestamp).toISOString() : 'N/A';
        console.log(`✅ Initial Request:       ${requestTime}`);
      }
      
      if (intentLinkLogs.length > 0) {
        const firstIntent = intentLinkLogs[0];
        const intentTime = firstIntent.timestamp ? new Date(firstIntent.timestamp).toISOString() : 'N/A';
        console.log(`✅ Intent Link Generated: ${intentTime}`);
        if (initialRequestLogs.length > 0 && firstIntent.timestamp && initialRequestLogs[0].timestamp) {
          const timeDiff = new Date(firstIntent.timestamp) - new Date(initialRequestLogs[0].timestamp);
          const seconds = Math.round(timeDiff / 1000);
          const milliseconds = timeDiff % 1000;
          console.log(`   ⏱️  Time from Request:     ${seconds}.${milliseconds}s`);
        }
      } else {
        console.log(`❌ Intent Link Generated: NOT FOUND (likely debug level log not stored)`);
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
          console.log(`   ⏱️  Time from Intent:      ${minutes}m ${remainingSeconds}s (${seconds} seconds)`);
        } else if (initialRequestLogs.length > 0 && firstCallback.timestamp && initialRequestLogs[0].timestamp) {
          const timeDiff = new Date(firstCallback.timestamp) - new Date(initialRequestLogs[0].timestamp);
          const seconds = Math.round(timeDiff / 1000);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          console.log(`   ⏱️  Time from Request:     ${minutes}m ${remainingSeconds}s (${seconds} seconds)`);
        }
      } else {
        console.log(`❌ Callback Received:     NOT FOUND`);
        console.log(`   ⚠️  The callback might have been received but not logged, or bypassed the controller`);
      }
      
      if (workerProcessedLogs.length > 0) {
        const firstWorker = workerProcessedLogs[0];
        const lastWorker = workerProcessedLogs[workerProcessedLogs.length - 1];
        const workerStartTime = firstWorker.timestamp ? new Date(firstWorker.timestamp).toISOString() : 'N/A';
        const workerEndTime = lastWorker.timestamp ? new Date(lastWorker.timestamp).toISOString() : 'N/A';
        console.log(`✅ Worker Started:         ${workerStartTime}`);
        console.log(`✅ Worker Completed:       ${workerEndTime}`);
        if (firstWorker.timestamp && lastWorker.timestamp) {
          const timeDiff = new Date(lastWorker.timestamp) - new Date(firstWorker.timestamp);
          const seconds = Math.round(timeDiff / 1000);
          const milliseconds = timeDiff % 1000;
          console.log(`   ⏱️  Total Processing Time:  ${seconds}.${milliseconds}s`);
        }
        if (callbackReceivedLogs.length > 0 && firstWorker.timestamp && callbackReceivedLogs[0].timestamp) {
          const timeDiff = new Date(firstWorker.timestamp) - new Date(callbackReceivedLogs[0].timestamp);
          const seconds = Math.round(timeDiff / 1000);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          console.log(`   ⏱️  Time from Callback:     ${minutes}m ${remainingSeconds}s (${seconds} seconds)`);
        } else if (initialRequestLogs.length > 0 && firstWorker.timestamp && initialRequestLogs[0].timestamp) {
          const timeDiff = new Date(firstWorker.timestamp) - new Date(initialRequestLogs[0].timestamp);
          const seconds = Math.round(timeDiff / 1000);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          console.log(`   ⏱️  Time from Request:      ${minutes}m ${remainingSeconds}s (${seconds} seconds)`);
        }
      } else {
        console.log(`❌ Worker Processed:      NOT FOUND`);
      }
      
      // Status Summary
      console.log('\n📈 STATUS SUMMARY');
      console.log('─────────────────────────────────────────────────────────────');
      const hasRequest = initialRequestLogs.length > 0;
      const hasIntent = intentLinkLogs.length > 0;
      const hasCallback = callbackReceivedLogs.length > 0;
      const hasWorker = workerProcessedLogs.length > 0;
      
      if (hasRequest && hasIntent && hasCallback && hasWorker) {
        console.log('✅ Transaction flow is COMPLETE');
        console.log('   ✓ Initial request received');
        console.log('   ✓ Intent link generated');
        console.log('   ✓ Callback received');
        console.log('   ✓ Worker processed successfully');
      } else {
        console.log('⚠️  Transaction flow analysis:');
        if (hasRequest) {
          console.log('   ✓ Initial request received');
        } else {
          console.log('   ✗ Initial request not found');
        }
        if (hasIntent) {
          console.log('   ✓ Intent link generation found');
        } else {
          console.log('   ✗ Intent link generation not found (likely debug level log not stored)');
        }
        if (hasCallback) {
          console.log('   ✓ Callback received in controller');
        } else {
          console.log('   ⚠️  Callback received log not found');
          console.log('      → Callback might have bypassed controller or was not logged');
          console.log('      → Worker started processing, so callback was likely received');
        }
        if (hasWorker) {
          console.log('   ✓ Worker processed successfully');
        } else {
          console.log('   ✗ Worker processing not found');
        }
      }
      
      // Gap Analysis
      if (hasRequest && hasWorker && !hasCallback) {
        console.log('\n🔍 GAP ANALYSIS:');
        const requestTime = new Date(initialRequestLogs[0].timestamp);
        const workerTime = new Date(workerProcessedLogs[0].timestamp);
        const gapMinutes = Math.round((workerTime - requestTime) / 1000 / 60);
        console.log(`   ⏱️  Gap between request and worker: ${gapMinutes} minutes`);
        console.log(`   💡 This suggests the callback was received but not logged in the controller`);
        console.log(`   💡 Or the callback was queued and processed later`);
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

