const { bipspayCallbackQueue } = require('../config/queue.config');

/**
 * Quick script to check only the count of jobs in bipspayCallbackQueue
 * Usage: node src/scripts/quick-check-bipspay-queue.js
 */
async function quickCheck() {
  try {
    await bipspayCallbackQueue.isReady();
    
    const jobCounts = await bipspayCallbackQueue.getJobCounts();
    
    console.log('\n📊 BipsPay Callback Queue - Job Counts');
    console.log('=====================================');
    console.log(`Waiting:  ${jobCounts.waiting || 0}`);
    console.log(`Active:   ${jobCounts.active || 0}`);
    console.log(`Delayed:  ${jobCounts.delayed || 0}`);
    console.log(`Failed:   ${jobCounts.failed || 0}`);
    console.log('=====================================');
    console.log(`Total:    ${(jobCounts.waiting || 0) + (jobCounts.active || 0) + (jobCounts.delayed || 0) + (jobCounts.failed || 0)}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await bipspayCallbackQueue.close();
    process.exit(0);
  }
}

quickCheck();

