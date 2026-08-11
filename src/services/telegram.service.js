const axios = require('axios');
const config = require('../config/config');
const { logger } = require('../utils/logger');

let warnedMissingConfig = false;

/**
 * Send a message to the configured Telegram chat via the Bot API.
 *
 * Best-effort and non-throwing: if the bot token / chat id are not configured,
 * or the Telegram API errors out, it logs and resolves to false rather than
 * throwing — callers on the payout hot path must never break on a failed alert.
 *
 * @param {string} text  Message body (HTML parse mode).
 * @returns {Promise<boolean>} true if Telegram accepted the message.
 */
async function sendTelegramMessage(text) {
  const { botToken, chatId } = config.telegram || {};

  if (!botToken || !chatId) {
    if (!warnedMissingConfig) {
      // Warn once at startup-ish, not on every payout, to avoid log spam.
      logger.warn('Telegram alerts skipped: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured');
      warnedMissingConfig = true;
    }
    return false;
  }

  try {
    await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      },
      { timeout: 8000 }
    );
    return true;
  } catch (error) {
    logger.error('Failed to send Telegram message', {
      error: error?.response?.data || error.message
    });
    return false;
  }
}

/** Escape user-supplied text so it is safe inside HTML parse mode. */
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { sendTelegramMessage, escapeHtml };
