const { payinQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');

async function clearQueue() {
  try {
    // Get all jobs in the queue
    const jobs = await payinQueue.getJobs(['waiting', 'active', 'delayed', 'failed', 'completed']);
    logger.info(`Found ${jobs.length} jobs in the queue`);

    // Remove all jobs
    await Promise.all(jobs.map(job => job.remove()));
    logger.info('All jobs have been removed from the queue');

    // Clean up completed and failed jobs
    await payinQueue.clean(0, 'completed');
    await payinQueue.clean(0, 'failed');
    logger.info('Queue has been cleaned up');

    process.exit(0);
  } catch (error) {
    logger.error('Error clearing queue:', error);
    process.exit(1);
  }
}

clearQueue(); 