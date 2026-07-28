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

/**
 * Parses a user-supplied date (YYYY-MM-DD, or any ISO string whose first 10
 * chars are the date) as an IST calendar date and returns the UTC instant of
 * that IST day's midnight. Returns null for empty/invalid input.
 *
 * Use this for report date-range filters so "28 Jul" means the IST day, not the
 * UTC day — otherwise `new Date('2026-07-28')` is parsed as UTC midnight (05:30
 * IST), shifting every boundary by 5.5 hours.
 *
 * @param {string} dateStr
 * @returns {Date|null}
 */
function istDayStartUtcFromDateString(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

/**
 * Builds a Mongo `createdAt` range filter for an inclusive IST date range.
 * `endDate` is treated as a whole IST day (the range extends to the end of that
 * day). Returns `{}` when neither bound is supplied.
 *
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @returns {{ $gte?: Date, $lt?: Date }}
 */
function istCreatedAtRange(startDate, endDate) {
  const range = {};
  const start = istDayStartUtcFromDateString(startDate);
  const endDayStart = istDayStartUtcFromDateString(endDate);
  if (start) range.$gte = start;
  if (endDayStart) range.$lt = new Date(endDayStart.getTime() + DAY_MS);
  return range;
}

module.exports = {
  IST_TIMEZONE,
  IST_OFFSET_MS,
  DAY_MS,
  istDayRange,
  istDaySkeleton,
  istDayStartUtcFromDateString,
  istCreatedAtRange,
};
