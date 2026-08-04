/**
 * Ready-made upload middlewares, one per uploads/ subfolder.
 * Each targets its own directory and enforces an appropriate file-type filter.
 *
 *   router.post('/:id/upload-avatar', upload.facultyAvatar, handler)
 *   router.post('/documents', upload.documents, handler)   // up to 5 files
 *
 * The stored public URL is `/uploads/<subfolder>/<filename>` (served statically
 * by app.js). Helpers below turn a multer file into that URL.
 */
const { uploader } = require('../config/multer');

const studentAvatar = uploader('students', { allow: 'image' }).single('avatar');
const facultyAvatar = uploader('faculty', { allow: 'image' }).single('avatar');
const certificateFile = uploader('certificates', { allow: 'document' }).single('file');
const documents = uploader('documents', { allow: 'document' }).array('documents', 5);

// Student project/homework submissions: archives allowed, larger cap.
const SUBMISSION_MAX_MB = Number(process.env.SUBMISSION_MAX_FILE_SIZE_MB) || 25;
const submission = uploader('submissions', { allow: 'archive', maxMb: SUBMISSION_MAX_MB }).single('file');

// Document Vault: a private drive, so the type filter is permissive (any office
// doc, sheet, drawing or archive) but the size cap still applies.
const VAULT_MAX_MB = Number(process.env.VAULT_MAX_FILE_SIZE_MB) || 25;
const vaultFile = uploader('documents', { allow: 'any', maxMb: VAULT_MAX_MB }).single('file');

// A resume. Small by definition — a 20MB CV is a red flag, not a portfolio.
const resume = uploader('resumes', { allow: 'document', maxMb: 5 }).single('file');

/** Public URL for a single stored file, or null. */
function fileUrl(subfolder, file) {
  return file ? `/uploads/${subfolder}/${file.filename}` : null;
}

/** Public URLs for an array of stored files. */
function fileUrls(subfolder, files = []) {
  return files.map((f) => `/uploads/${subfolder}/${f.filename}`);
}

module.exports = {
  studentAvatar,
  facultyAvatar,
  certificateFile,
  documents,
  submission,
  vaultFile,
  resume,
  fileUrl,
  fileUrls,
};
