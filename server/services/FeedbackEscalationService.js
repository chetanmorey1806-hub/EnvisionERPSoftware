/**
 * FeedbackEscalationService — quality-assurance filter on anonymous feedback.
 *
 * A response escalates when EITHER:
 *   - the overall rating falls below the institute threshold, or
 *   - the free text contains a critical keyword (harassment, unsafe, etc.).
 *
 * Escalated rows are flagged for the Admin dashboard and remain invisible to
 * the trainer — trainers hold no `feedback.view` permission at all, so this is
 * enforced by RBAC, not by a WHERE clause the UI could forget.
 */
const LOW_RATING_THRESHOLD = Number(process.env.LOW_RATING_THRESHOLD) || 3.5;

// Words that must never be silently averaged away.
const CRITICAL_KEYWORDS = [
  'harass', 'abuse', 'abusive', 'insult', 'discriminat', 'racist', 'casteist',
  'unsafe', 'threat', 'drunk', 'inappropriate', 'misconduct', 'bully',
  'never teaches', 'always absent', 'refund',
];

/** Returns { escalated, reason } — pure, so it is trivially testable. */
function evaluate({ overall, comments }) {
  const reasons = [];

  if (overall != null && Number(overall) < LOW_RATING_THRESHOLD) {
    reasons.push(`rating ${Number(overall).toFixed(2)} < ${LOW_RATING_THRESHOLD}`);
  }

  if (comments) {
    const text = String(comments).toLowerCase();
    const hits = CRITICAL_KEYWORDS.filter((k) => text.includes(k));
    if (hits.length) reasons.push(`critical keyword: ${hits.join(', ')}`);
  }

  return { escalated: reasons.length > 0, reason: reasons.join(' | ').slice(0, 255) || null };
}

module.exports = { evaluate, CRITICAL_KEYWORDS, LOW_RATING_THRESHOLD };
