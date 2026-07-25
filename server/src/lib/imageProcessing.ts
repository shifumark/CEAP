import sharp, { type Sharp } from 'sharp';

export interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

// Document/ID photos never need to be larger than this to be legible —
// resizing before upload is most of the size reduction, with JPEG
// re-encoding doing the rest.
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 82;

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

function withJpgExtension(originalname: string): string {
  const withoutExt = originalname.replace(/\.[^./\\]+$/, '');
  return `${withoutExt}.jpg`;
}

/**
 * Validates and, for images, resizes + compresses the upload before it's
 * sent to Drive. Multer's fileFilter (upload.ts) already checks the
 * client-declared mimetype, but that's just a request header the client
 * controls — a video renamed to declare "image/jpeg" would sail through
 * it unchanged. Actually decoding the file with sharp (for images) or
 * checking its magic bytes (for PDF) confirms the bytes really are what
 * they claim to be, which is what actually blocks a disguised video
 * upload rather than just an honestly-labeled one.
 */
export async function processUploadedFile(file: UploadFile): Promise<UploadFile> {
  if (file.mimetype === 'application/pdf') {
    if (!file.buffer.subarray(0, 5).toString('latin1').startsWith('%PDF-')) {
      throw new Error('This file is not a valid PDF.');
    }
    return file;
  }

  if (IMAGE_MIME_TYPES.has(file.mimetype)) {
    let image: Sharp;
    try {
      image = sharp(file.buffer, { failOn: 'error' });
      await image.metadata();
    } catch {
      throw new Error('This file is not a valid image. Video files are not accepted.');
    }

    const compressed = await image
      .rotate() // applies EXIF orientation, then strips it, so phone photos display upright everywhere
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return {
      buffer: compressed,
      originalname: withJpgExtension(file.originalname),
      mimetype: 'image/jpeg',
      size: compressed.length
    };
  }

  throw new Error('Only PDF, JPG, and PNG files are allowed.');
}
