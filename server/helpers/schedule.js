/**
 * Shared timetable helpers.
 *
 * `days_of_week` is stored as a JSON array (e.g. ["mon","wed","fri"]).
 * NULL / empty is read as "every day" — the conservative default, so an
 * unspecified schedule is never silently treated as free.
 */
const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Normalize a batch's days_of_week into an array of lowercase keys. */
function parseDays(value) {
  if (!value) return ALL_DAYS;
  const arr = typeof value === 'string' ? JSON.parse(value) : value;
  return Array.isArray(arr) && arr.length ? arr.map((d) => String(d).toLowerCase()) : ALL_DAYS;
}

/** 'mon' | 'tue' | ... for a Date or 'YYYY-MM-DD' string. */
function weekdayKey(date) {
  const d = date instanceof Date ? date : new Date(`${date}T00:00:00`);
  return ALL_DAYS[(d.getDay() + 6) % 7]; // JS: 0=Sun -> shift so 0=Mon
}

/** Does this batch run on the given date (weekday + date-range)? */
function runsOn(batch, date) {
  const day = weekdayKey(date);
  if (!parseDays(batch.days_of_week).includes(day)) return false;

  const target = new Date(`${date}T00:00:00`).getTime();
  const start = batch.start_date ? new Date(batch.start_date).getTime() : -Infinity;
  const end = batch.end_date ? new Date(batch.end_date).getTime() : Infinity;
  return target >= start && target <= end;
}

/** 'HH:MM:SS' -> minutes since midnight (fallback when null). */
function toMinutes(t, fallback = 0) {
  if (!t) return fallback;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}

module.exports = { ALL_DAYS, parseDays, weekdayKey, runsOn, toMinutes };
