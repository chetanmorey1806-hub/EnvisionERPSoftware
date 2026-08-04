const router = require('express').Router();
const C = require('../controllers/DocumentVaultController');
const { authenticate } = require('../middleware/auth');
const { can } = require('../middleware/permission');
const upload = require('../middleware/upload');
const h = require('../utils/asyncHandler');

router.use(authenticate);

// ---- admin (every vault) — must precede '/files/:id' style routes ----------
router.get('/owners', can('documents.manage'), h(C.owners));
router.get('/all-files', can('documents.manage'), h(C.allFiles));

// ---- tags & people ---------------------------------------------------------
router.get('/tags', can('documents.view'), h(C.listTags));
router.get('/users', can('documents.share'), h(C.shareUsers));

// ---- sharing ---------------------------------------------------------------
router.get('/shared-with-me', can('documents.view'), h(C.sharedWithMe));
router.get('/shared-by-me', can('documents.view'), h(C.sharedByMe));
router.post('/share', can('documents.share'), h(C.share));
router.delete('/share/:id', can('documents.share'), h(C.revokeShare));

// ---- folders ---------------------------------------------------------------
router.get('/folders', can('documents.view'), h(C.listFolders));
router.post('/folders', can('documents.create'), h(C.createFolder));
router.get('/folders/:id/breadcrumb', can('documents.view'), h(C.breadcrumb));
router.patch('/folders/:id/move', can('documents.update'), h(C.moveFolder));
router.patch('/folders/:id', can('documents.update'), h(C.renameFolder));
router.delete('/folders/:id', can('documents.delete'), h(C.deleteFolder));

// ---- files -----------------------------------------------------------------
router.get('/files', can('documents.view'), h(C.listFiles));
router.post('/files/upload', can('documents.create'), upload.vaultFile, h(C.uploadFile));
router.get('/files/:id/download', can('documents.view'), h(C.download));
router.get('/files/:id/view', can('documents.view'), h(C.view));
router.patch('/files/:id/move', can('documents.update'), h(C.moveFile));
router.patch('/files/:id', can('documents.update'), h(C.updateFile));
router.delete('/files/:id', can('documents.delete'), h(C.deleteFile));

module.exports = router;
