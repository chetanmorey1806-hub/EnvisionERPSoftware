/**
 * Validation schemas for the Fees module.
 */
module.exports = {
  collect: {
    student_id: { required: true, type: 'number', min: 1, label: 'Student' },
    amount: { required: true, type: 'number', min: 1, label: 'Amount' },
    mode: { enum: ['cash', 'card', 'upi', 'bank', 'cheque'], label: 'Payment mode' },
  },
};
