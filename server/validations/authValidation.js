/**
 * Validation schemas for the Auth module.
 */
module.exports = {
  register: {
    name: { required: true, type: 'string', min: 2, max: 120, label: 'Name' },
    email: { required: true, type: 'email', label: 'Email' },
    password: { required: true, type: 'string', min: 6, max: 64, label: 'Password' },
    role: { enum: ['staff', 'student', 'faculty', 'placement'], label: 'Role' },
  },

  login: {
    email: { required: true, type: 'email', label: 'Email' },
    password: { required: true, type: 'string', label: 'Password' },
  },

  verifyOtp: {
    email: { required: true, type: 'email', label: 'Email' },
    code: { required: true, type: 'string', min: 6, max: 6, label: 'Verification code' },
  },

  resendOtp: {
    email: { required: true, type: 'email', label: 'Email' },
  },

  forgotPassword: {
    email: { required: true, type: 'email', label: 'Email' },
  },

  resetPassword: {
    token: { required: true, type: 'string', label: 'Reset token' },
    password: { required: true, type: 'string', min: 6, max: 64, label: 'Password' },
  },
};
