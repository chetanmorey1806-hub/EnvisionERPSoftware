/**
 * AuthService — business logic for authentication.
 * Controllers stay thin: they call these methods and map the result to HTTP.
 * Errors are thrown as Error objects with a `.status` so the central error
 * handler renders the right code (401/403/409/...).
 */
const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');
const RoleModel = require('../models/RoleModel');
const OtpService = require('./OtpService');
const { provisionProfile } = require('./ProfileProvisioningService');
const { query } = require('../config/db');
const { signAccessToken } = require('../config/jwt');
const { sendPasswordResetEmail } = require('../config/mail');
const { randomToken } = require('../helpers/generators');

const SELF_REGISTER_ROLES = ['staff', 'student', 'faculty', 'placement'];

function httpError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function sanitize(row) {
  if (!row) return null;
  const { password, reset_token, reset_token_expires, ...safe } = row;
  return safe;
}

function issueToken(user) {
  return signAccessToken({ id: user.id, role: user.role, email: user.email });
}

const AuthService = {
  /**
   * Self-registration. The account is created UNVERIFIED and no token is
   * returned — the caller must confirm the emailed OTP first. This prevents
   * anyone signing up with an address they do not control.
   */
  async register({ name, email, password, role, phone }) {
    if (await UserModel.existsByEmail(email)) {
      throw httpError('An account with this email already exists.', 409);
    }
    const safeRole = SELF_REGISTER_ROLES.includes(role) ? role : 'staff';
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ name, email, passwordHash, role: safeRole, phone });

    await query('UPDATE users SET is_verified = 0 WHERE id = ?', [user.id]);
    await query('UPDATE users u JOIN roles r ON r.name = u.role SET u.role_id = r.id WHERE u.id = ?', [user.id]);

    const { expiresInMinutes } = await OtpService.issue(email, 'register');
    return { email: String(email).toLowerCase(), expiresInMinutes };
  },

  /** Confirm the emailed code, activate the account, and sign the user in. */
  async verifyRegistration({ email, code }) {
    await OtpService.verify(email, code, 'register');

    const account = await UserModel.findByEmailWithSecret(email);
    if (!account) throw httpError('Account not found.', 404);

    await query('UPDATE users SET is_verified = 1 WHERE id = ?', [account.id]);

    // A users row only grants login. Give the account its domain profile
    // (faculty/students) or the portals will 403 on every request.
    const profile = await provisionProfile(account);

    const fresh = await UserModel.findById(account.id);
    const permissions = await RoleModel.permissionNamesForUser(account.id);
    return { token: issueToken(fresh), user: { ...fresh, permissions, profile } };
  },

  async resendOtp(email) {
    const account = await UserModel.findByEmailWithSecret(email);
    // Do not reveal whether the address exists.
    if (account && !account.is_verified) await OtpService.issue(email, 'register');
    return true;
  },

  async login({ email, password }) {
    const account = await UserModel.findByEmailWithSecret(email);
    if (!account) throw httpError('Invalid email or password.', 401);
    if (account.status !== 'active') {
      throw httpError('This account is not active. Contact an administrator.', 403);
    }
    // An admin can switch sign-in off without deleting the account.
    if (account.login_enabled === 0) {
      throw httpError('Sign-in is disabled for this account. Contact an administrator.', 403);
    }
    if (account.is_verified === 0) {
      throw httpError('Please verify your email. We sent you a 6-digit code.', 403);
    }
    const matches = await bcrypt.compare(password, account.password);
    if (!matches) throw httpError('Invalid email or password.', 401);

    await UserModel.updateLastLogin(account.id);
    const permissions = await RoleModel.permissionNamesForUser(account.id);
    return { token: issueToken(account), user: { ...sanitize(account), permissions } };
  },

  async getMe(userId) {
    const user = await UserModel.findById(userId);
    if (!user) throw httpError('User account no longer exists.', 404);
    const permissions = await RoleModel.permissionNamesForUser(userId);
    return { ...user, permissions };
  },

  /** Always resolves (never reveals whether the email exists). */
  async forgotPassword(email) {
    const account = await UserModel.findByEmailWithSecret(email);
    if (account) {
      const token = randomToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await UserModel.setResetToken(account.id, token, expires);
      await sendPasswordResetEmail(account.email, token);
    }
  },

  async resetPassword(token, password) {
    const account = await UserModel.findByResetToken(token);
    if (!account) throw httpError('Reset link is invalid or has expired.', 400);
    const passwordHash = await bcrypt.hash(password, 10);
    await UserModel.updatePassword(account.id, passwordHash);
  },
};

module.exports = AuthService;
