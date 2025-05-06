const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const { logger } = require('../utils/logger');

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  require('../workers/payment.worker');
  logger.info(`Worker ${process.pid} started`);
} 