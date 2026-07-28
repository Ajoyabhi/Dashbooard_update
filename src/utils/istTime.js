/**
 * IST (Asia/Kolkata, UTC+05:30) time helpers for reporting/bucketing.
 *
 * Both MySQL (Sequelize connection defaults to UTC) and MongoDB store
 * timestamps as UTC instants, so the two stores are already in sync. These
 * helpers convert those UTC instants into IST calendar days *at read time*,
 * so dashboards bucket "today" / per-day figures by the business timezone
 * without changing anything about how data is written.
 */

const IST_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // +05:30
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the UTC window and IST calendar-date label for a single IST day,
 * `daysAgo` days before the current IST day (0 = today in IST).
 *
 * @param {number} daysAgo
 * @returns {{ startUtc: Date, endUtc: Date, nextStartUtc: Date, dateLabel: string }}
 */
function istDayRange(daysAgo = 0) {
  // Shift "now" into IST wall-clock so UTC getters read IST values.
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const istMidnight = new Date(nowIst);
  istMidnight.setUTCDate(istMidnight.getUTCDate() - daysAgo);
  istMidnight.setUTCHours(0, 0, 0, 0);

  const dateLabel = istMidnight.toISOString().split('T')[0]; // IST calendar date
  const startUtc = new Date(istMidnight.getTime() - IST_OFFSET_MS); // real UTC instant of IST midnight
  const nextStartUtc = new Date(startUtc.getTime() + DAY_MS);
  const endUtc = new Date(nextStartUtc.getTime() - 1);

  return { startUtc, endUtc, nextStartUtc, dateLabel };
}

/**
 * Builds a contiguous list of IST day ranges (oldest first) spanning the last
 * `days` IST calendar days, including today.
 *
 * @param {number} days
 * @returns {Array<{ startUtc: Date, endUtc: Date, nextStartUtc: Date, dateLabel: string }>}
 */
function istDaySkeleton(days) {
  const skeleton = [];
  for (let i = days - 1; i >= 0; i--) {
    skeleton.push(istDayRange(i));
  }
  return skeleton;
}

module.exports = {
  IST_TIMEZONE,
  IST_OFFSET_MS,
  DAY_MS,
  istDayRange,
  istDaySkeleton,
};
