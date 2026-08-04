/**
 * Small date helpers. All functions return MySQL-friendly 'YYYY-MM-DD' strings.
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** ISO datetime string 'YYYY-MM-DD HH:MM:SS' for DATETIME columns. */
function nowDateTime() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { today, addDays, formatDate, nowDateTime };
