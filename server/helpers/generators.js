/**
 * Deterministic-ish generators for human-readable identifiers.
 * Format: PREFIX-YYYYMMDD-XXXX (XXXX = time/random suffix), unique enough for
 * receipts, certificates and admission numbers without a sequence table.
 */
const crypto = require('crypto');

function stamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function suffix(len = 4) {
  return crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, len);
}

const generators = {
  receiptNo: () => `RCPT-${stamp()}-${suffix()}`,
  certificateNumber: () => `ENV-CERT-${stamp()}-${suffix(6)}`,
  admissionNo: () => `ADM-${stamp()}-${suffix()}`,
  employeeNo: (prefix = 'EMP') => `${prefix}-${stamp()}-${suffix()}`,
  /** Cryptographically-strong opaque token (e.g. password reset). */
  randomToken: (bytes = 32) => crypto.randomBytes(bytes).toString('hex'),
};

module.exports = generators;
