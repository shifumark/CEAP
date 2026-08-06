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
//
// Every upload is squeezed under TARGET_MAX_BYTES if at all possible:
// tried at the full dimension across a descending quality ladder first
// (cheapest way to shed size without losing resolution), then — only if
// quality alone can't get there — at progressively smaller dimensions,
// each retried across the same quality ladder. DIMENSION_STEPS/
// QUALITY_STEPS must both stay sorted descending; the search relies on
// trying the least-destructive combination first.
const DIMENSION_STEPS = [2000, 1600, 1200, 900];
const QUALITY_STEPS = [82, 65, 50, 35];
const TARGET_MAX_BYTES = 300 * 1024;

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

function withJpgExtension(originalname: string): string {
  const withoutExt = originalname.replace(/\.[^./\\]+$/, '');
  return `${withoutExt}.jpg`;
}

/**
 * Resizes + re-encodes `image` (already had .rotate() applied by the
 * caller) until the result is under TARGET_MAX_BYTES, or every
 * dimension/quality combination has been exhausted. Resizes once per
 * dimension step and re-encodes only the quality against that same
 * resized pixel data, rather than re-resizing for every quality
 * attempt — resizing is the expensive part of each attempt.
 *
 * If nothing gets under the target (an extremely dense image even at
 * the smallest dimension/lowest quality), returns the smallest result
 * found rather than degrading further into an illegible image.
 */
async function compressUnderTarget(image: Sharp): Promise<Buffer> {
  let smallest: Buffer | null = null;

  for (const dimension of DIMENSION_STEPS) {
    const resized = await image.clone().resize({ width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true }).toBuffer();
    const resizedImage = sharp(resized);

    for (const quality of QUALITY_STEPS) {
      const buffer = await resizedImage.clone().jpeg({ quality }).toBuffer();

      if (!smallest || buffer.length < smallest.length) {
        smallest = buffer;
      }
      if (buffer.length <= TARGET_MAX_BYTES) {
        return buffer;
      }
    }
  }

  return smallest!;
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

    // applies EXIF orientation, then strips it, so phone photos display
    // upright everywhere — queued once here so every attempt inside
    // compressUnderTarget (each a .clone() of this pipeline) inherits it.
    const compressed = await compressUnderTarget(image.rotate());

    return {
      buffer: compressed,
      originalname: withJpgExtension(file.originalname),
      mimetype: 'image/jpeg',
      size: compressed.length
    };
  }

  throw new Error('Only PDF, JPG, and PNG files are allowed.');
}
