/**
 * Nightly communication run — fee reminders, attendance warnings,
 * low-feedback alerts.
 *
 * Wire to cron (06:15 daily):
 *   15 6 * * *  cd /path/to/server && npm run emails:daily >> logs/cron.log 2>&1
 *
 * Safe to re-run: EmailTriggerService skips any recipient who already received
 * the same template today, so a cron retry does not double-send.
 */
require('dotenv').config();
const EmailTriggerService = require('../services/EmailTriggerService');

(async () => {
  try {
    const out = await EmailTriggerService.runDaily();
    console.log('[emails:daily]', JSON.stringify({
      feeReminders: out.feeReminders.sent,
      attendanceWarnings: out.attendanceWarnings.sent,
      lowFeedbackAlerts: out.lowFeedbackAlerts.sent,
    }));
    process.exit(0);
  } catch (err) {
    console.error('[emails:daily] FAILED:', err.message);
    process.exit(1);
  }
})();
