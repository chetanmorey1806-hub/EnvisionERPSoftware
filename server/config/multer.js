/**
 * Multer storage factory for file uploads.
 *
 *   uploader('faculty', { allow: 'image' }).single('avatar')
 *   uploader('documents', { allow: 'document' }).array('documents', 5)
 *
 * Files are stored under uploads/<subfolder> with a unique, sanitized name and
 * are size-capped by MAX_FILE_SIZE_MB. `allow` controls the accepted MIME set:
 *   'image'    -> png/jpg/jpeg/gif/webp
 *   'document' -> images + pdf/doc/docx
 *   'any'      -> no type restriction
 */
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
const MAX_MB = Number(process.env.MAX_FILE_SIZE_MB) || 5;

const FILTERS = {
  image: /^image\/(png|jpe?g|gif|webp)$/,
  document: /^(image\/(png|jpe?g|gif|webp)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document))$/,
  // Student project submissions: documents + archives (zip/rar/7z/tar/gz).
  archive:
    /^(image\/(png|jpe?g|gif|webp)|text\/plain|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|zip|x-zip-compressed|x-7z-compressed|x-rar-compressed|vnd\.rar|x-tar|gzip|x-gzip|octet-stream))$/,
  any: null,
};

const LABELS = {
  image: 'image',
  document: 'image or document (pdf/doc)',
  archive: 'document or archive (pdf/doc/zip/rar/7z)',
};

function uploader(subfolder = '', { allow = 'image', maxMb } = {}) {
  const dest = path.join(UPLOAD_ROOT, subfolder);
  fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${file.fieldname}-${unique}${ext}`);
    },
  });

  const pattern = FILTERS[allow];

  return multer({
    storage,
    limits: { fileSize: (maxMb || MAX_MB) * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!pattern || pattern.test(file.mimetype)) return cb(null, true);
      const label = LABELS[allow] || 'supported';
      return cb(Object.assign(new Error(`Only ${label} files are allowed.`), { status: 422 }));
    },
  });
}

module.exports = { uploader, UPLOAD_ROOT, MAX_MB };
