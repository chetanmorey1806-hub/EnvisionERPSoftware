/**
 * OtpService — email one-time codes for self-registration.
 *
 * Security properties:
 *  - The code is NEVER stored in plaintext. We store HMAC-SHA256(code, secret),
 *    so a database leak does not hand an attacker working codes.
 *  - Codes expire (10 min) and are single-use (`consumed_at`).
 *  - Attempts are capped (5) to defeat brute-forcing a 6-digit code.
 *  - Issuing a new code invalidates any outstanding one for that email+purpose.
 */
const crypto = require('crypto');
const { query } = require('../config/db');
const { sendMail } = require('../config/mail');
const logger = require('../logs/logger');

const TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES) || 10;
const MAX_ATTEMPTS = 5;
const SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET || 'dev_otp_secret';

const httpError = (message, status) => Object.assign(new Error(message), { status });

const hash = (code) => crypto.createHmac('sha256', SECRET).update(String(code)).digest('hex');

/** Cryptographically-random 6-digit code (not Math.random). */
function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

const OtpService = {
  /** Issue a code, invalidating any previous unconsumed one. */
  async issue(email, purpose = 'register') {
    const addr = String(email).toLowerCase();

    await query(
      'UPDATE otp_verifications SET consumed_at = NOW() WHERE email = ? AND purpose = ? AND consumed_at IS NULL',
      [addr, purpose]
    );

    const code = generateCode();
    const expires = new Date(Date.now() + TTL_MINUTES * 60 * 1000);
    await query(
      'INSERT INTO otp_verifications (email, purpose, code_hash, expires_at) VALUES (?, ?, ?, ?)',
      [addr, purpose, hash(code), expires]
    );

    await sendMail({
      to: addr,
      subject: `Your Envision verification code: ${code}`,
      text: `Your verification code is ${code}. It expires in ${TTL_MINUTES} minutes.\n\nIf you did not request this, ignore this email.`,
      html:
        `<p>Your Envision verification code is:</p>` +
        `<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>` +
        `<p>It expires in ${TTL_MINUTES} minutes. If you did not request this, ignore this email.</p>`,
    });

    logger.info(`[otp] issued ${purpose} code for ${addr}`);
    return { expiresInMinutes: TTL_MINUTES };
  },

  /** Verify and consume a code. Throws on invalid/expired/exhausted. */
  async verify(email, code, purpose = 'register') {
    const addr = String(email).toLowerCase();
    const rows = await query(
      `SELECT * FROM otp_verifications
       WHERE email = ? AND purpose = ? AND consumed_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [addr, purpose]
    );
    const otp = rows[0];
    if (!otp) throw httpError('No verification code was requested. Please request a new one.', 400);

    if (new Date(otp.expires_at) < new Date()) {
      throw httpError('This code has expired. Please request a new one.', 400);
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      throw httpError('Too many incorrect attempts. Please request a new code.', 429);
    }

    // Constant-time compare of the hashes.
    const provided = Buffer.from(hash(code));
    const stored = Buffer.from(otp.code_hash);
    const ok = provided.length === stored.length && crypto.timingSafeEqual(provided, stored);

    if (!ok) {
      await query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?', [otp.id]);
      const left = MAX_ATTEMPTS - (otp.attempts + 1);
      throw httpError(`Incorrect code. ${left > 0 ? `${left} attempt(s) left.` : 'Please request a new code.'}`, 400);
    }

    await query('UPDATE otp_verifications SET consumed_at = NOW() WHERE id = ?', [otp.id]);
    return true;
  },
};

module.exports = OtpService;
