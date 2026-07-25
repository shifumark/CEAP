import multer from 'multer';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export const upload = multer({
  storage: multer.memoryStorage(),
  // 5MB per file. This is the raw upload size before processing — an
  // image under this cap still gets resized/compressed further before
  // it reaches Drive (see imageProcessing.ts), so the file actually
  // stored is always smaller still.
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
  }
});
