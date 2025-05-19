const { callbackQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');

async function inspectQueue() {
  try {
    // Get jobs in different states
    const waitingJobs = await callbackQueue.getWaiting();
    const activeJobs = await callbackQueue.getActive();
    const delayedJobs = await callbackQueue.getDelayed();
    const failedJobs = await callbackQueue.getFailed();
    const completedJobs = await callbackQueue.getCompleted();

    // Log summary
    console.log('\n=== Queue Status Summary ===');
    console.log({
      waiting: waitingJobs.length,
      active: activeJobs.length,
      delayed: delayedJobs.length,
      failed: failedJobs.length,
      completed: completedJobs.length
    });

    // Log details of failed jobs
    if (failedJobs.length > 0) {
      console.log('\n=== Failed Jobs Details ===');
      for (const job of failedJobs) {
        console.log('\nJob ID:', job.id);
        console.log('Data:', JSON.stringify(job.data, null, 2));
        console.log('Attempts:', job.attemptsMade);
        console.log('Failed Reason:', job.failedReason);
        console.log('Failed At:', new Date(job.finishedOn).toLocaleString());
        console.log('----------------------------------------');
      }
    }

    // Log details of waiting jobs
    if (waitingJobs.length > 0) {
      console.log('\n=== Waiting Jobs Details ===');
      for (const job of waitingJobs) {
        console.log('\nJob ID:', job.id);
        console.log('Data:', JSON.stringify(job.data, null, 2));
        console.log('Created At:', new Date(job.timestamp).toLocaleString());
        console.log('----------------------------------------');
      }
    }

    // Log details of active jobs
    if (activeJobs.length > 0) {
      console.log('\n=== Active Jobs Details ===');
      for (const job of activeJobs) {
        console.log('\nJob ID:', job.id);
        console.log('Data:', JSON.stringify(job.data, null, 2));
        console.log('Attempts:', job.attemptsMade);
        console.log('Started At:', new Date(job.processedOn).toLocaleString());
        console.log('----------------------------------------');
      }
    }

    // Log details of delayed jobs
    if (delayedJobs.length > 0) {
      console.log('\n=== Delayed Jobs Details ===');
      for (const job of delayedJobs) {
        console.log('\nJob ID:', job.id);
        console.log('Data:', JSON.stringify(job.data, null, 2));
        console.log('Created At:', new Date(job.timestamp).toLocaleString());
        console.log('Delay:', job.delay, 'ms');
        console.log('----------------------------------------');
      }
    }

    // Get queue metrics
    const jobCounts = await callbackQueue.getJobCounts();
    console.log('\n=== Queue Metrics ===');
    console.log(jobCounts);

  } catch (error) {
    console.error('Error inspecting queue:', error);
  } finally {
    // Close the queue connection
    await callbackQueue.close();
    process.exit(0);
  }
}

// Run the inspection
inspectQueue(); 