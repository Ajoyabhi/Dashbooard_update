/**
 * MizorPay-only synthetic beneficiary contact pool.
 *
 * The MizorPay payout contract (§1 Initiate) requires `email` and `mobile`, but
 * our upstream payout requests do NOT carry the beneficiary's email/phone — we
 * only receive account_number / ifsc / beneficiary_name. To satisfy MizorPay's
 * required fields WITHOUT sending real personal data we never collected, we pick
 * a random entry from a pre-seeded pool of ~250 plausible Indian email/mobile
 * pairs (src/seeders/mizorpay_contacts.json).
 *
 * IMPORTANT: This is intentionally used ONLY on the MizorPay payout path. Every
 * other gateway (BluSwap, etc.) keeps its existing behaviour and must not use
 * this pool.
 */
const contacts = require('../seeders/mizorpay_contacts.json');

/**
 * Return a random { email, mobile } pair from the seed pool.
 * Falls back to a safe default if the pool is somehow empty.
 * @returns {{ email: string, mobile: string }}
 */
function getRandomMizorpayContact() {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return { email: 'payouts@example.com', mobile: '9000000000' };
  }
  const idx = Math.floor(Math.random() * contacts.length);
  const picked = contacts[idx];
  return { email: picked.email, mobile: picked.mobile };
}

module.exports = { getRandomMizorpayContact };
