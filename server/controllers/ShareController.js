/**
 * ShareController — send a document (PDF, certificate, assignment, receipt)
 * to one or more email addresses.
 *
 * SECURITY: `attachmentUrl` is attacker-controlled. It is resolved against the
 * uploads root and rejected unless the resolved path stays INSIDE that root —
 * otherwise `/uploads/../../.env` would happily email out your secrets.
 */
const fs = require('fs');
const path = require('path');
const { sendMail } = require('../config/mail');
const { UPLOAD_ROOT } = require('../config/multer');
const { query } = require('../config/db');
const { success, fail } = require('../utils/response');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 10;

/** Resolve `/uploads/x/y.pdf` to an absolute path, or null if it escapes root. */
function safeAttachmentPath(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith('/uploads/')) return null;

  const relative = url.replace(/^\/uploads\//, '');
  const resolved = path.resolve(UPLOAD_ROOT, relative);
  const root = path.resolve(UPLOAD_ROOT);

  // Must stay within the uploads root (blocks ../ traversal).
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}

const ShareController = {
  // POST /share/email  { to: string|string[], subject, message, attachmentUrl?, link? }
  async email(req, res) {
    const { to, subject, message, attachmentUrl, link } = req.body || {};

    const recipients = (Array.isArray(to) ? to : String(to || '').split(','))
      .map((e) => e.trim())
      .filter(Boolean);

    if (recipients.length === 0) return fail(res, 'At least one recipient is required.', 422);
    if (recipients.length > MAX_RECIPIENTS) {
      return fail(res, `At most ${MAX_RECIPIENTS} recipients per email.`, 422);
    }
    const bad = recipients.find((e) => !EMAIL_RE.test(e));
    if (bad) return fail(res, `"${bad}" is not a valid email address.`, 422);
    if (!subject) return fail(res, 'subject is required.', 422);

    const attachments = [];
    if (attachmentUrl) {
      const filePath = safeAttachmentPath(attachmentUrl);
      if (!filePath) return fail(res, 'Attachment not found or not permitted.', 422);
      attachments.push({ filename: path.basename(filePath), path: filePath });
    }

    const body = `${message || ''}${link ? `\n\n${link}` : ''}`;
    const html =
      `<p>${(message || '').replace(/\n/g, '<br>')}</p>` +
      (link ? `<p><a href="${link}">${link}</a></p>` : '') +
      `<p style="color:#888;font-size:12px">Sent from Envision Computer Training Institute, Pune.</p>`;

    const result = await sendMail({
      to: recipients.join(', '),
      subject,
      text: body,
      html,
      ...(attachments.length ? { attachments } : {}),
    });

    return success(
      res,
      { data: { recipients, sent: result.sent, attached: attachments.length } },
      result.sent
        ? `Email sent to ${recipients.length} recipient(s).`
        : 'SMTP is not configured — the email was logged instead of sent.'
    );
  },

  /**
   * GET /share/contacts?role=faculty|student
   * Directory used to build WhatsApp / email links on the client.
   */
  async contacts(req, res) {
    const { role } = req.query;
    let rows = [];

    if (role === 'student') {
      rows = await query(
        "SELECT id, name, email, phone, 'student' AS role FROM students WHERE status = 'active' ORDER BY name"
      );
    } else if (role === 'faculty') {
      rows = await query(
        "SELECT id, name, email, phone, 'faculty' AS role FROM faculty WHERE status = 'active' ORDER BY name"
      );
    } else {
      rows = await query(
        `SELECT u.id, u.name, u.email, u.phone, u.role
         FROM users u WHERE u.status = 'active' ORDER BY u.name`
      );
    }
    return success(res, { data: rows }, 'Contacts fetched.');
  },
};

module.exports = ShareController;
