/**
 * /api/auth routes — matches client/src/api/authApi.js exactly.
 */
const router = require('express').Router();
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rules = require('../validations/authValidation');
const h = require('../utils/asyncHandler');

router.post('/register', validate(rules.register), h(AuthController.register));
router.post('/login', validate(rules.login), h(AuthController.login));
router.get('/me', authenticate, h(AuthController.me));
router.post('/forgot-password', validate(rules.forgotPassword), h(AuthController.forgotPassword));
router.post('/reset-password', validate(rules.resetPassword), h(AuthController.resetPassword));
router.post('/verify-otp', validate(rules.verifyOtp), h(AuthController.verifyOTP));
router.post('/resend-otp', validate(rules.resendOtp), h(AuthController.resendOtp));

module.exports = router;
