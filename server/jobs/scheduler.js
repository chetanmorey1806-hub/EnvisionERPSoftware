/**
 * The nightly clock.
 *
 * Everything "automatic" in this system used to depend on an admin remembering
 * to click a button, or on a crontab line that was documented but never
 * installed. So a fee was never overdue, a fine was never raised, and a
 * student's drop-out risk was whatever it had been the last time someone
 * pressed the button. This runs it.
 *
 * Deliberately dependency-free (no node-cron): a single timer that wakes up,
 * checks whether the local wall-clock has passed the run time, and runs the
 * day's pass at most once. Restarting the server mid-day does not re-run it,
 * because each task is itself idempotent — see FeeService.sweepOverdue.
 *
 * DAILY_JOBS_AT=HH:MM (default 06:15). DAILY_JOBS=off disables it entirely,
 * which is what you want on a developer's laptop.
 */
const FeeService = require('../services/FeeService');
const RetentionService = require('../services/RetentionService');
const EmployabilityService = require('../services/EmployabilityService');
const EmailTriggerService = require('../services/EmailTriggerService');
const logger = require('../logs/logger');

const CHECK_EVERY_MS = 60 * 1000; // wake once a minute; cheap
let lastRunDay = null;
let timer = null;

function parseAt(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || '').trim());
  if (!m) return { h: 6, m: 15 };
  return { h: Math.min(23, Number(m[1])), m: Math.min(59, Number(m[2])) };
}

/** Run every daily task. Each is isolated: one failing must not stop the rest. */
async function runDailyJobs(reason = 'schedule') {
  const started = Date.now();
  const results = {};

  const tasks = [
    // Order matters: sweep first so the reminders that follow describe today's
    // true position (including any fine raised moments ago).
    ['fees.sweepOverdue', () => FeeService.sweepOverdue()],
    ['retention.recompute', () => RetentionService.recomputeAll()],
    // Readiness is derived from attendance and scores, both of which move every
    // day. Without this, a student who stopped attending in week 9 would still
    // be sitting in the placement pool wearing a Job-Ready tag.
    ['employability.recompute', () => EmployabilityService.recomputeAll()],
    ['emails.daily', () => EmailTriggerService.runDaily()],
  ];

  for (const [name, fn] of tasks) {
    try {
      results[name] = await fn();
    } catch (err) {
      results[name] = { error: err.message };
      logger.error(`[jobs] ${name} failed: ${err.message}`);
    }
  }

  logger.info(`[jobs] daily pass (${reason}) finished in ${Date.now() - started}ms`);
  return results;
}

function start() {
  if (String(process.env.DAILY_JOBS || '').toLowerCase() === 'off') {
    logger.info('[jobs] scheduler disabled (DAILY_JOBS=off)');
    return null;
  }
  const at = parseAt(process.env.DAILY_JOBS_AT || '06:15');

  timer = setInterval(async () => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (lastRunDay === day) return;                       // already ran today
    if (now.getHours() < at.h) return;
    if (now.getHours() === at.h && now.getMinutes() < at.m) return;

    lastRunDay = day;                                     // claim BEFORE running,
    await runDailyJobs('schedule');                       // so a slow pass can't double-fire
  }, CHECK_EVERY_MS);

  timer.unref?.();                                        // never hold the process open
  logger.info(`[jobs] scheduler armed for ${String(at.h).padStart(2, '0')}:${String(at.m).padStart(2, '0')} daily`);
  return timer;
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, runDailyJobs };
