const mongoose = require('mongoose');
const config = require('./index');
const { logger } = require('../utils/logger');

/**
 * Single, shared MongoDB connector for every process (API, callback worker,
 * scripts). Mongo now runs LOCALLY on the same VPS, so latency is sub-ms and the
 * pool is about bounding concurrency + keeping a few warm sockets, not hiding
 * network RTT. maxPoolSize also caps how hard one process can hit the co-located
 * mongod (it shares the box's CPU/RAM with MySQL, Redis and the API).
 *
 * Tunables (env, with safe defaults):
 *   MONGO_MAX_POOL  - max connections to mongod per process (default 50)
 *   MONGO_MIN_POOL  - warm connections kept open per process (default 10)
 *
 * Idempotent: safe to call from multiple modules — it connects at most once.
 */
const mongooseOptions = {
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL || '50', 10),
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL || '10', 10),
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // force IPv4 (localhost)
  // NOTE: no `directConnection` set — the driver auto-detects from the URI, so
  // this works whether the local mongod is a plain standalone or a single-node
  // replica set. (retryWrites / w:'majority' come from the URI when applicable.)
};

let connectingPromise = null;

function connectMongo() {
  // 1 = connected, 2 = connecting — reuse the existing connection.
  const state = mongoose.connection.readyState;
  if (state === 1) return Promise.resolve(mongoose.connection);
  if (state === 2 && connectingPromise) return connectingPromise;

  if (!connectingPromise) {
    logger.info('Connecting to MongoDB', {
      maxPoolSize: mongooseOptions.maxPoolSize,
      minPoolSize: mongooseOptions.minPoolSize,
    });
    connectingPromise = mongoose
      .connect(config.mongodb.uri, mongooseOptions)
      .then((m) => {
        logger.info('Connected to MongoDB (pool warmed)');
        return m.connection;
      })
      .catch((err) => {
        connectingPromise = null; // allow a later retry
        logger.error('MongoDB connection error', {
          error: err.message,
          name: err.name,
          code: err.code,
        });
        throw err;
      });
  }
  return connectingPromise;
}

module.exports = { connectMongo, mongooseOptions };
