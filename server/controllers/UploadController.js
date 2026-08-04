/**
 * UploadController — generic file intake for the certificates/ and documents/
 * upload folders. Returns the stored public URL(s); persisting the reference to
 * a specific record is left to the owning module.
 */
const { fileUrl, fileUrls } = require('../middleware/upload');
const { success, created, fail } = require('../utils/response');

const UploadController = {
  // POST /files/certificate  (multipart, field "file")
  async certificate(req, res) {
    if (!req.file) return fail(res, 'No file uploaded (field "file").', 422);
    return created(res, { data: { url: fileUrl('certificates', req.file) } }, 'Certificate file uploaded.');
  },

  // POST /files/documents  (multipart, field "documents", up to 5)
  async documents(req, res) {
    if (!req.files || req.files.length === 0) {
      return fail(res, 'No files uploaded (field "documents").', 422);
    }
    return created(res, { data: { urls: fileUrls('documents', req.files) } }, 'Documents uploaded.');
  },
};

module.exports = UploadController;
