const { bipspayCallbackQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');

/**
 * Script to inspect bipspayCallbackQueue jobs
 * Shows count and details of jobs in different states
 */
async function checkBipspayCallbackQueue() {
  try {
    console.log('\n🔍 Checking BipsPay Callback Queue Status...\n');
    console.log('='.repeat(60));

    // Wait for queue to be ready
    await bipspayCallbackQueue.isReady();
    console.log('✅ Queue is ready and connected\n');

    // Get job counts for all states
    const jobCounts = await bipspayCallbackQueue.getJobCounts();
    
    console.log('📊 QUEUE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Waiting Jobs:    ${jobCounts.waiting || 0}`);
    console.log(`Active Jobs:      ${jobCounts.active || 0}`);
    console.log(`Delayed Jobs:     ${jobCounts.delayed || 0}`);
    console.log(`Failed Jobs:      ${jobCounts.failed || 0}`);
    console.log(`Completed Jobs:   ${jobCounts.completed || 0}`);
    console.log(`Total Jobs:       ${(jobCounts.waiting || 0) + (jobCounts.active || 0) + (jobCounts.delayed || 0) + (jobCounts.failed || 0)}`);
    console.log('='.repeat(60));

    // Get jobs in different states
    const waitingJobs = await bipspayCallbackQueue.getWaiting();
    const activeJobs = await bipspayCallbackQueue.getActive();
    const delayedJobs = await bipspayCallbackQueue.getDelayed();
    const failedJobs = await bipspayCallbackQueue.getFailed();

    // Display Waiting Jobs
    if (waitingJobs.length > 0) {
      console.log('\n⏳ WAITING JOBS (' + waitingJobs.length + ')');
      console.log('='.repeat(60));
      waitingJobs.forEach((job, index) => {
        console.log(`\n[${index + 1}] Job ID: ${job.id}`);
        console.log(`    Created At: ${new Date(job.timestamp).toLocaleString()}`);
        console.log(`    Data:`, JSON.stringify(job.data, null, 6));
        console.log(`    Attempts: ${job.attemptsMade || 0}`);
        console.log('-'.repeat(60));
      });
    } else {
      console.log('\n✅ No waiting jobs');
    }

    // Display Active Jobs
    if (activeJobs.length > 0) {
      console.log('\n🔄 ACTIVE JOBS (' + activeJobs.length + ')');
      console.log('='.repeat(60));
      activeJobs.forEach((job, index) => {
        console.log(`\n[${index + 1}] Job ID: ${job.id}`);
        console.log(`    Started At: ${job.processedOn ? new Date(job.processedOn).toLocaleString() : 'N/A'}`);
        console.log(`    Data:`, JSON.stringify(job.data, null, 6));
        console.log(`    Attempts: ${job.attemptsMade || 0}`);
        console.log('-'.repeat(60));
      });
    } else {
      console.log('\n✅ No active jobs');
    }

    // Display Delayed Jobs
    if (delayedJobs.length > 0) {
      console.log('\n⏰ DELAYED JOBS (' + delayedJobs.length + ')');
      console.log('='.repeat(60));
      delayedJobs.forEach((job, index) => {
        console.log(`\n[${index + 1}] Job ID: ${job.id}`);
        console.log(`    Created At: ${new Date(job.timestamp).toLocaleString()}`);
        console.log(`    Delay: ${job.delay || 0}ms`);
        console.log(`    Data:`, JSON.stringify(job.data, null, 6));
        console.log(`    Attempts: ${job.attemptsMade || 0}`);
        console.log('-'.repeat(60));
      });
    } else {
      console.log('\n✅ No delayed jobs');
    }

    // Display Failed Jobs
    if (failedJobs.length > 0) {
      console.log('\n❌ FAILED JOBS (' + failedJobs.length + ')');
      console.log('='.repeat(60));
      failedJobs.forEach((job, index) => {
        console.log(`\n[${index + 1}] Job ID: ${job.id}`);
        console.log(`    Failed At: ${job.finishedOn ? new Date(job.finishedOn).toLocaleString() : 'N/A'}`);
        console.log(`    Attempts: ${job.attemptsMade || 0}`);
        console.log(`    Failed Reason: ${job.failedReason || 'N/A'}`);
        console.log(`    Data:`, JSON.stringify(job.data, null, 6));
        console.log('-'.repeat(60));
      });
    } else {
      console.log('\n✅ No failed jobs');
    }

    // Additional queue information
    console.log('\n📈 QUEUE METRICS');
    console.log('='.repeat(60));
    const queueMetrics = {
      waiting: waitingJobs.length,
      active: activeJobs.length,
      delayed: delayedJobs.length,
      failed: failedJobs.length
    };
    console.log(JSON.stringify(queueMetrics, null, 2));
    console.log('='.repeat(60));

    // Get queue name
    console.log(`\n📋 Queue Name: bipspayPayinCallback`);
    console.log(`🔗 Queue Key: ${bipspayCallbackQueue.name}`);
    console.log('\n✅ Queue inspection completed!\n');

  } catch (error) {
    console.error('\n❌ Error inspecting queue:', error);
    logger.error('Error checking bipspay callback queue:', error);
  } finally {
    // Close the queue connection
    try {
      await bipspayCallbackQueue.close();
      console.log('🔌 Queue connection closed');
    } catch (error) {
      console.error('Error closing queue:', error);
    }
    process.exit(0);
  }
}

// Run the inspection
checkBipspayCallbackQueue();

