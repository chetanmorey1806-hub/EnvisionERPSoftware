/**
 * Email transport (nodemailer).
 *
 * The transporter is created lazily from the MAIL_* env vars. If SMTP is not
 * configured (no MAIL_HOST), the module falls back to "log" mode — emails are
 * printed to the console instead of sent, so development never breaks and
 * password-reset tokens are still visible in the server log.
 *
 *   const { sendMail, sendPasswordResetEmail } = require('./config/mail');
 *   await sendMail({ to, subject, html });
 */
const nodemailer = require('nodemailer');

const {
  MAIL_HOST,
  MAIL_PORT = 587,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM = 'Envision ERP <no-reply@envision.local>',
  CLIENT_URL = 'http://localhost:5173',
} = process.env;

const isConfigured = Boolean(MAIL_HOST);

let transporter = null;

/** Build (once) and return the nodemailer transporter, or null in log mode. */
function getTransporter() {
  if (!isConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: Number(MAIL_PORT),
      secure: Number(MAIL_PORT) === 465, // true for 465, STARTTLS otherwise
      auth: MAIL_USER ? { user: MAIL_USER, pass: MAIL_PASS } : undefined,
    });
  }
  return transporter;
}

/** Optional startup check — logs whether SMTP is reachable. */
async function verifyConnection() {
  const tx = getTransporter();
  if (!tx) {
    // eslint-disable-next-line no-console
    console.warn('[mail] SMTP not configured — running in log mode (emails printed to console).');
    return false;
  }
  try {
    await tx.verify();
    // eslint-disable-next-line no-console
    console.log('[mail] SMTP connection OK.');
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[mail] SMTP verify failed: ${err.message}`);
    return false;
  }
}

/**
 * Send an email. Returns { sent, previewLogged }.
 * Never throws for a missing SMTP config — it logs instead so callers
 * (e.g. forgot-password) don't fail the request.
 */
async function sendMail({ to, subject, html, text, from = MAIL_FROM, attachments }) {
  if (!to) throw Object.assign(new Error('sendMail: "to" is required.'), { status: 422 });

  const tx = getTransporter();
  if (!tx) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mail:log] (SMTP disabled) email not sent\n  to:      ${to}\n  subject: ${subject}` +
      `${attachments?.length ? `\n  attach:  ${attachments.map((a) => a.filename).join(', ')}` : ''}` +
      `\n  body:    ${text || html || ''}\n`
    );
    return { sent: false, previewLogged: true };
  }

  const info = await tx.sendMail({ from, to, subject, text, html, ...(attachments?.length ? { attachments } : {}) });
  return { sent: true, messageId: info.messageId };
}

/** Convenience: password-reset email with a link to the client reset page. */
async function sendPasswordResetEmail(to, resetToken) {
  const link = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const subject = 'Reset your Envision ERP password';
  const text =
    `We received a request to reset your password.\n\n` +
    `Reset link (valid for 1 hour): ${link}\n\n` +
    `If you did not request this, you can safely ignore this email.`;
  const html =
    `<p>We received a request to reset your password.</p>` +
    `<p><a href="${link}">Click here to reset your password</a> (valid for 1 hour).</p>` +
    `<p>If you did not request this, you can safely ignore this email.</p>`;
  return sendMail({ to, subject, text, html });
}

module.exports = {
  isConfigured,
  getTransporter,
  verifyConnection,
  sendMail,
  sendPasswordResetEmail,
};
