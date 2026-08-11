const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '365d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    // A merchant that has been quiet on payouts for longer than this many
    // minutes triggers one "wake-up" alert on their next payout. Tune freely.
    payoutAlertPauseMinutes: parseInt(process.env.PAYOUT_ALERT_PAUSE_MINUTES || '120', 10)
  }
};

module.exports = config; 