/**
 * Document numbering — the running number on an admission, a fee receipt and a
 * certificate.
 *
 * The shape of that number is a setting (Settings → Global Settings), not a
 * constant: prefix, suffix, how many digits, and what the next serial is. One
 * series per document type per academic year, so April starts a fresh count
 * without disturbing last year's records.
 *
 * Allocation is atomic. `SELECT ... FOR UPDATE` holds the row while the serial
 * is read and incremented, so two counters taking money at the same moment
 * cannot both be handed RCPT/0041. Pass the caller's `conn` when you are
 * already inside a transaction — the number is then allocated and used or
 * rolled back together, and a failed save never burns a serial.
 *
 * Returns null when the institute has not configured that series, which is the
 * signal to fall back to the random generator in helpers/generators.js.
 */
const { pool } = require('../config/db');

/** The documents this system actually raises a number for. */
const DOC_TYPES = [
  { type: 'admission', label: 'Admission', prefix: 'ADM/', note: "A student's admission number" },
  { type: 'fee_receipt', label: 'Fee Receipt', prefix: 'RCPT/', note: 'Every receipt handed over the counter' },
  { type: 'certificate', label: 'Certificate', prefix: 'CERT/', note: 'Course completion certificates' },
];
const DOC_TYPE_KEYS = new Set(DOC_TYPES.map((d) => d.type));

/** April–March, the Indian academic year: 2026 → "2026-27". */
function currentFy(date = new Date()) {
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Render a serial against a series row. */
function format(row, serial) {
  const pad = Math.max(1, Math.min(10, Number(row.padding) || 4));
  return `${row.prefix || ''}${String(serial).padStart(pad, '0')}${row.suffix || ''}`;
}

/** What the next number WOULD read — no allocation, for the settings preview. */
function preview(row) {
  return format(row, Math.max(1, Number(row.next_number) || 1));
}

async function allocate(conn, docType, fy) {
  const [rows] = await conn.execute(
    'SELECT * FROM `numbering_series` WHERE doc_type = ? AND fy = ? LIMIT 1 FOR UPDATE',
    [docType, fy]
  );
  const row = rows[0];
  if (!row) return null;                      // not configured — caller falls back
  const serial = Math.max(1, Number(row.next_number) || 1);
  await conn.execute(
    'UPDATE `numbering_series` SET next_number = ? WHERE id = ?',
    [serial + 1, row.id]
  );
  return format(row, serial);
}

/**
 * Take the next number for `docType`.
 *
 *   const receipt = await nextNumber('fee_receipt', { conn }) || receiptNo();
 *
 * `conn` — the connection of the transaction you are already inside. Without
 * one, this opens its own short transaction.
 */
async function nextNumber(docType, { conn = null, fy = currentFy() } = {}) {
  if (!DOC_TYPE_KEYS.has(docType)) return null;
  if (conn) return allocate(conn, docType, fy);

  const own = await pool.getConnection();
  try {
    await own.beginTransaction();
    const number = await allocate(own, docType, fy);
    await own.commit();
    return number;
  } catch (err) {
    try { await own.rollback(); } catch { /* connection already dead */ }
    throw err;
  } finally {
    own.release();
  }
}

module.exports = { DOC_TYPES, DOC_TYPE_KEYS, currentFy, format, preview, nextNumber };
