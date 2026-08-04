const router = require('express').Router();
const C = require('../controllers/SettingsController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const h = require('../utils/asyncHandler');

router.use(authenticate);
router.get('/profile', can('settings.view'), h(C.getInstitutionProfile));
router.put('/profile', can('settings.update'), h(C.updateInstitutionProfile));
router.get('/backups', can('settings.view'), h(C.getBackupLogs));
router.post('/backups/trigger', can('settings.update'), h(C.triggerBackup));

module.exports = router;
