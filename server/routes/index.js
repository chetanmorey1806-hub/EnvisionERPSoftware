/**
 * API router root — mounts every module under /api.
 */
const router = require('express').Router();
const { isConnected } = require('../config/db');

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Envision ERP API is running.',
    db: isConnected() ? 'connected' : 'disconnected',
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/roles', require('./role.routes'));
router.use('/users', require('./user.routes'));
router.use('/students', require('./student.routes'));
router.use('/classroom', require('./classroom.routes'));
router.use('/classes', require('./class.routes'));
router.use('/share', require('./share.routes'));
router.use('/documents', require('./document.routes'));
router.use('/courses', require('./course.routes'));
router.use('/rooms', require('./room.routes'));
router.use('/batches', require('./batch.routes'));
router.use('/faculty', require('./faculty.routes'));
router.use('/staff', require('./staff.routes'));
router.use('/admissions', require('./admission.routes'));
router.use('/enquiries', require('./enquiry.routes'));
router.use('/followups', require('./followup.routes'));
router.use('/fees', require('./fee.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/exams', require('./exam.routes'));
router.use('/results', require('./result.routes'));
router.use('/certificates', require('./certificate.routes'));
router.use('/placements', require('./placement.routes'));
router.use('/trainer', require('./trainer.routes'));
router.use('/partners', require('./partner.routes'));
router.use('/library', require('./library.routes'));
router.use('/inventory', require('./inventory.routes'));
router.use('/reports', require('./report.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/files', require('./upload.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/chat', require('./chat.routes'));

module.exports = router;
