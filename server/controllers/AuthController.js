/**
 * AuthController — thin HTTP layer over AuthService.
 * Validation is handled by middleware/validate; business logic by the service.
 *
 * Response shapes (flat, to match the React client):
 *   login/register -> { success, message, token, user }
 *   me             -> { success, message, user }
 */
const AuthService = require('../services/AuthService');
const { success, created } = require('../utils/response');

const AuthController = {
  // POST /api/auth/register  -> sends an OTP; no token until verified
  async register(req, res) {
    const result = await AuthService.register(req.body);
    return created(res, result, 'Account created. Check your email for the 6-digit code.');
  },

  // POST /api/auth/resend-otp
  async resendOtp(req, res) {
    await AuthService.resendOtp(req.body.email);
    return success(res, {}, 'If that account needs verification, a new code has been sent.');
  },

  // POST /api/auth/login
  async login(req, res) {
    const result = await AuthService.login(req.body);
    return success(res, result, 'Signed in successfully.');
  },

  // GET /api/auth/me  (protected)
  async me(req, res) {
    const user = await AuthService.getMe(req.user.id);
    return success(res, { user }, 'Session valid.');
  },

  // POST /api/auth/forgot-password
  async forgotPassword(req, res) {
    await AuthService.forgotPassword(req.body.email);
    return success(res, {}, 'If an account exists for that email, a reset link has been sent.');
  },

  // POST /api/auth/reset-password
  async resetPassword(req, res) {
    await AuthService.resetPassword(req.body.token, req.body.password);
    return success(res, {}, 'Password updated. You can now sign in.');
  },

  // POST /api/auth/verify-otp  { email, code } -> verifies and signs in
  async verifyOTP(req, res) {
    const result = await AuthService.verifyRegistration(req.body);
    return success(res, result, 'Email verified. You are signed in.');
  },
};

module.exports = AuthController;
