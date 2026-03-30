/**
 * Linear decay: 1.15 at auction start → 1.00 at global end_time.
 * Uses the global end_time (not extended_end_time) so snipe extensions
 * don't affect the early-bid reward incentive.
 *
 * @param {Date} placedAt
 * @param {Date} startTime
 * @param {Date} endTime   global auction end_time (not per-team extended)
 * @returns {number}
 */
function computeMultiplier(placedAt, startTime, endTime) {
  const duration = endTime.getTime() - startTime.getTime();
  if (duration <= 0) return 1.0;
  const elapsed = placedAt.getTime() - startTime.getTime();
  const t = Math.min(1, Math.max(0, elapsed / duration));
  const m = 1.15 - 0.15 * t;
  return Math.round(m * 1e6) / 1e6; // 6 decimal places
}

module.exports = { computeMultiplier };
