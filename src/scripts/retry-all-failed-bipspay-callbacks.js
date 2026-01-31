const { bipspayCallbackQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');

/**
 * Script to automatically retry ALL failed BipsPay callback jobs
 * Non-interactive version - useful for automation/cron jobs
 * 
 * Usage: node src/scripts/retry-all-failed-bipspay-callbacks.js
 */
async function retryAllFailedJobs() {
  try {
    console.log('\n🔄 BipsPay Callback Queue - Auto Retry All Failed Jobs');
    console.log('='.repeat(60));

    // Wait for queue to be ready
    await bipspayCallbackQueue.isReady();
    console.log('✅ Queue is ready and connected\n');

    // Get failed jobs
    const failedJobs = await bipspayCallbackQueue.getFailed();
    const jobCounts = await bipspayCallbackQueue.getJobCounts();

    console.log('📊 CURRENT QUEUE STATUS');
    console.log('='.repeat(60));
    console.log(`Failed Jobs:      ${jobCounts.failed || 0}`);
    console.log(`Waiting Jobs:     ${jobCounts.waiting || 0}`);
    console.log(`Active Jobs:      ${jobCounts.active || 0}`);
    console.log('='.repeat(60));

    if (failedJobs.length === 0) {
      console.log('\n✅ No failed jobs to retry!\n');
      await bipspayCallbackQueue.close();
      process.exit(0);
    }

    console.log(`\n🔄 Retrying all ${failedJobs.length} failed jobs...\n`);

    // Retry all jobs
    const results = {
      success: [],
      failed: []
    };

    for (const job of failedJobs) {
      try {
        const apitxnid = job.data?.apitxnid || job.data?.data?.reference || job.data?.data?.order_id || 'N/A';
        console.log(`🔄 Retrying Job ID: ${job.id} (Reference: ${apitxnid})...`);
        
        // Retry the job
        await job.retry();
        
        results.success.push({
          jobId: job.id,
          referenceId: apitxnid
        });
        
        console.log(`✅ Job ${job.id} queued for retry`);
        
        logger.info('Auto-retried failed BipsPay callback job', {
          jobId: job.id,
          referenceId: apitxnid,
          previousAttempts: job.attemptsMade,
          failedReason: job.failedReason
        });
      } catch (error) {
        results.failed.push({
          jobId: job.id,
          error: error.message
        });
        console.log(`❌ Failed to retry Job ${job.id}: ${error.message}`);
        
        logger.error('Error auto-retrying failed BipsPay callback job', {
          jobId: job.id,
          error: error.message
        });
      }
    }

    // Display results
    console.log('\n📊 RETRY RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successfully queued: ${results.success.length}`);
    console.log(`❌ Failed to retry: ${results.failed.length}`);
    console.log('='.repeat(60));

    if (results.success.length > 0) {
      console.log('\n✅ Successfully Retried Jobs:');
      results.success.forEach(result => {
        console.log(`   - Job ID: ${result.jobId} (Reference: ${result.referenceId})`);
      });
    }

    if (results.failed.length > 0) {
      console.log('\n❌ Failed to Retry Jobs:');
      results.failed.forEach(result => {
        console.log(`   - Job ID: ${result.jobId}: ${result.error}`);
      });
    }

    // Get updated queue status
    const updatedCounts = await bipspayCallbackQueue.getJobCounts();
    console.log('\n📊 UPDATED QUEUE STATUS');
    console.log('='.repeat(60));
    console.log(`Failed Jobs:      ${updatedCounts.failed || 0}`);
    console.log(`Waiting Jobs:     ${updatedCounts.waiting || 0}`);
    console.log(`Active Jobs:      ${updatedCounts.active || 0}`);
    console.log('='.repeat(60));

    console.log('\n✅ Auto-retry operation completed!\n');

  } catch (error) {
    console.error('\n❌ Error retrying failed jobs:', error);
    logger.error('Error auto-retrying failed BipsPay callback jobs:', error);
    process.exit(1);
  } finally {
    // Close the queue connection
    try {
      await bipspayCallbackQueue.close();
      console.log('🔌 Queue connection closed\n');
    } catch (error) {
      console.error('Error closing queue:', error);
    }
    process.exit(0);
  }
}

// Run the retry script
retryAllFailedJobs();

