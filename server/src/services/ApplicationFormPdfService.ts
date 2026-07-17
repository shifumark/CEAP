import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Applicant } from '../types.js';

// Resolved relative to the process's working directory, which is the
// server/ root both locally (npm run dev/start) and on Render (rootDir:
// server) — these assets ship as plain files alongside dist/, untouched
// by the tsc build step.
const CONNER_SEAL_PATH = path.join(process.cwd(), 'assets/logos/conner-seal.jpg');
const BAGONG_PILIPINAS_PATH = path.join(process.cwd(), 'assets/logos/bagong-pilipinas.png');

const MAYOR_NAME = 'ATTY. JORICO F. BAYAUA';
const MAYOR_TITLE = 'Municipal Mayor';

function formatDate(value?: Date): string {
  if (!value) return '';
  const d = new Date(value);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

function joinNonEmpty(parts: (string | undefined)[], sep = ', '): string {
  return parts.filter((p) => p && p.trim()).join(sep);
}

// Single-line value text that truncates with an ellipsis instead of
// wrapping — a wrapped second line would silently overflow the fixed-
// height field box and collide with the row below it, since pdfkit
// doesn't clip text to a box on its own.
function value(doc: PDFKit.PDFDocument, text: string, x: number, y: number, w: number) {
  doc.font('Helvetica').fontSize(10).text(text, x, y, { width: w, height: 12, ellipsis: true });
}

// Read once at module load (not per-request) and reused as Buffers —
// avoids pdfkit re-reading from disk on every single request, and lets
// a missing/corrupt file fail loudly at startup instead of silently
// during PDF generation.
function loadLogo(logoPath: string, label: string): Buffer | undefined {
  try {
    const buf = fs.readFileSync(logoPath);
    console.log(`[ApplicationFormPdf] loaded ${label}: ${buf.length} bytes from ${logoPath}`);
    return buf;
  } catch (err: any) {
    console.error(`[ApplicationFormPdf] failed to load ${label} from ${logoPath}:`, err.message);
    return undefined;
  }
}

const connerSealBuffer = loadLogo(CONNER_SEAL_PATH, 'Conner seal');
const bagongPilipinasBuffer = loadLogo(BAGONG_PILIPINAS_PATH, 'Bagong Pilipinas logo');

function draw(doc: PDFKit.PDFDocument, applicant: Applicant): void {
  const pageWidth = doc.page.width;
  const contentLeft = 30;
  const contentWidth = pageWidth - 60;

  // ---------- Header ----------
  console.log('[ApplicationFormPdf] drawing header images');
  if (connerSealBuffer) {
    doc.image(connerSealBuffer, contentLeft, 20, { width: 65, height: 65 });
  }
  if (bagongPilipinasBuffer) {
    doc.image(bagongPilipinasBuffer, pageWidth - 30 - 70, 15, { width: 70, height: 70 });
  }

  console.log('[ApplicationFormPdf] drawing header text');
  doc.font('Helvetica-Bold').fontSize(11).text('REPUBLIC OF THE PHILIPPINES', 0, 22, { align: 'center', width: pageWidth });
  doc.text('PROVINCE OF APAYAO', 0, 35, { align: 'center', width: pageWidth });
  doc.text('MUNICIPALITY OF CONNER', 0, 48, { align: 'center', width: pageWidth });
  doc.fontSize(16).text('CONNER EDUCATIONAL ASSISTANCE PROGRAM (CEAP)', 0, 65, { align: 'center', width: pageWidth });
  doc.fontSize(13).text('SPECIAL COURSE', 0, 85, { align: 'center', width: pageWidth });

  doc.moveTo(contentLeft, 110).lineTo(pageWidth - 30, 110).lineWidth(1).stroke();

  // ---------- Field boxes ----------
  console.log('[ApplicationFormPdf] drawing field boxes');
  const idBoxWidth = 130;
  const formWidth = contentWidth - idBoxWidth - 15;
  let y = 122;

  // An actual 2x2 inch photo is a square -- computed here (rather than
  // just before it's drawn) so other boxes can align their right edge
  // to it, e.g. the Mobile No. box below.
  const idPhotoSize = 130;
  const idPhotoX = contentLeft + formWidth + 15 + (idBoxWidth - idPhotoSize) / 2;
  const idPhotoRight = idPhotoX + idPhotoSize;

  const box = (label: string, height: number, drawFn: (x: number, y: number, w: number) => void, boxWidth = formWidth, labelYOffset = 0) => {
    doc.roundedRect(contentLeft, y, boxWidth, height, 4).stroke();
    doc.font('Helvetica-Bold').fontSize(10).text(label, contentLeft + 8, y + 6 + labelYOffset);
    drawFn(contentLeft + 8, y + 6, boxWidth - 16);
    y += height + 6;
  };
  // Rows below the ID picture box have no column to their right to
  // avoid, so they widen to fill the full content width, lining up
  // with the Mobile No. box's right edge.
  const fullRowWidth = idPhotoRight - contentLeft;

  box('NAME:', 40, (x, ty, w) => {
    const nameLabelWidth = 45;
    const nameX = x + nameLabelWidth;
    const nameW = w - nameLabelWidth;
    // Column boundaries as fractions of nameW; label sits directly under
    // its corresponding value, both left-aligned within their column.
    const boundaries = [0, 0.32, 0.6, 0.85, 1];
    const cols = [
      { value: applicant.firstName, label: '(FIRST NAME)' },
      { value: applicant.middleName ?? '', label: '(MIDDLE NAME)' },
      { value: applicant.lastName, label: '(LAST NAME)' },
      { value: applicant.suffix ?? '', label: '(EXT. NAME)' }
    ];
    const colX = (i: number) => nameX + nameW * boundaries[i];
    const colW = (i: number) => nameW * (boundaries[i + 1] - boundaries[i]);
    // Vertically centered within the row (ty to the divider line at
    // ty+20) instead of sitting flush at the top, which left a visible
    // gap of empty space below the text.
    cols.forEach((col, i) => {
      doc.font('Helvetica').fontSize(10).text(col.value, colX(i), ty + 4, { width: colW(i), height: 12, ellipsis: true });
    });
    doc.moveTo(x, ty + 20).lineTo(x + w, ty + 20).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7);
    cols.forEach((col, i) => {
      doc.text(col.label, colX(i), ty + 23, { width: colW(i) });
    });
  });

  const address = joinNonEmpty([applicant.address, applicant.barangay, applicant.municipality, applicant.province]);
  box('ADDRESS:', 26, (x, ty, w) => {
    value(doc, address, x + 60, ty + 5, w - 60);
  }, formWidth, 5);

  box('BIRTHDATE:', 26, (x, ty, w) => {
    value(doc, formatDate(applicant.dateOfBirth), x + 65, ty, 90);
    doc.font('Helvetica-Bold').fontSize(10).text('AGE:', x + 160, ty);
    value(doc, applicant.age !== undefined ? String(applicant.age) : '', x + 190, ty, 40);
    doc.font('Helvetica-Bold').text('CIVIL STATUS:', x + 240, ty);
    value(doc, applicant.civilStatus ?? '', x + 320, ty, 100);
    doc.font('Helvetica-Bold').text('SEX:', x + 430, ty);
    value(doc, applicant.sex ?? '', x + 460, ty, 80);
  });

  box('SCHOOL:', 26, (x, ty, w) => {
    value(doc, applicant.schoolName ?? '', x + 55, ty, w - 55);
  });

  box('SCHOOL ADDRESS:', 26, (x, ty, w) => {
    value(doc, applicant.schoolAddress ?? '', x + 105, ty, w - 105);
  });

  // Two separate boxes side by side, matching the source form's split
  // (Course/Year in one box, Mobile No. in its own narrower box).
  {
    const rowHeight = 26;
    // Course box matches formWidth so its right edge lines up with the
    // School Address box above. Mobile No. sits directly above the 2x2
    // ID box, matching its left and right edges exactly.
    const courseBoxWidth = formWidth;
    const mobileBoxX = idPhotoX;
    const mobileBoxWidth = idPhotoRight - mobileBoxX;

    doc.roundedRect(contentLeft, y, courseBoxWidth, rowHeight, 4).stroke();
    doc.font('Helvetica-Bold').fontSize(10).text('COURSE:', contentLeft + 8, y + 6);
    value(doc, applicant.courseName ?? '', contentLeft + 8 + 55, y + 6, courseBoxWidth * 0.55 - 55);
    doc.font('Helvetica-Bold').text('YEAR:', contentLeft + courseBoxWidth * 0.6, y + 6);
    value(doc, applicant.yearLevel ?? '', contentLeft + courseBoxWidth * 0.6 + 38, y + 6, courseBoxWidth * 0.4 - 38);

    doc.roundedRect(mobileBoxX, y, mobileBoxWidth, rowHeight, 4).stroke();
    doc.font('Helvetica-Bold').fontSize(10).text('MOBILE NO.:', mobileBoxX + 8, y + 6);
    value(doc, applicant.contactNumber ?? '', mobileBoxX + 8, y + 18, mobileBoxWidth - 16);

    y += rowHeight + 6;
  }

  box("FATHER'S NAME:", 26, (x, ty, w) => {
    value(doc, applicant.father?.name ?? '', x + 95, ty, w * 0.55 - 95);
    doc.font('Helvetica-Bold').fontSize(10).text('OCCUPATION:', x + w * 0.6, ty);
    value(doc, applicant.father?.occupation ?? '', x + w * 0.6 + 80, ty, w * 0.4 - 80);
  }, fullRowWidth);

  box("MOTHER'S NAME:", 26, (x, ty, w) => {
    value(doc, applicant.mother?.name ?? '', x + 95, ty, w * 0.55 - 95);
    doc.font('Helvetica-Bold').fontSize(10).text('OCCUPATION:', x + w * 0.6, ty);
    value(doc, applicant.mother?.occupation ?? '', x + w * 0.6 + 80, ty, w * 0.4 - 80);
  }, fullRowWidth);

  box("GUARDIAN'S NAME:", 26, (x, ty, w) => {
    value(doc, applicant.guardian?.name ?? '', x + 105, ty, w * 0.45 - 105);
    doc.font('Helvetica-Bold').fontSize(10).text('RELATIONSHIP:', x + w * 0.48, ty);
    // Left blank — relationship isn't captured in the profile; filled in by hand.
    doc.font('Helvetica-Bold').text('OCCUPATION:', x + w * 0.72, ty);
    value(doc, applicant.guardian?.occupation ?? '', x + w * 0.72 + 80, ty, w * 0.28 - 80);
  }, fullRowWidth);

  // ---------- 2x2 ID picture box ----------
  console.log('[ApplicationFormPdf] drawing ID box and footer');
  doc.roundedRect(idPhotoX, 122, idPhotoSize, idPhotoSize, 4).stroke();
  doc
    .font('Helvetica')
    .fontSize(9)
    .text('LATEST 2X2 ID PICTURE', contentLeft + formWidth + 15, 122 + idPhotoSize + 10, { width: idBoxWidth, align: 'center' });

  // ---------- Certification + signatures ----------
  y += 6;
  doc.font('Helvetica-Oblique').fontSize(10).text('I hereby certify that all the information I have provided herein is true and correct.', contentLeft, y);
  y += 40;

  const colWidth = contentWidth / 3;
  doc.moveTo(contentLeft, y).lineTo(contentLeft + colWidth - 20, y).lineWidth(0.5).stroke();
  doc.moveTo(contentLeft + colWidth, y).lineTo(contentLeft + colWidth * 2 - 20, y).stroke();
  doc.moveTo(contentLeft + colWidth * 2, y).lineTo(contentLeft + colWidth * 3 - 20, y).stroke();

  doc.font('Helvetica-Bold').fontSize(10).text(MAYOR_NAME, contentLeft + colWidth * 2, y - 14, { width: colWidth - 20, align: 'center' });

  doc.font('Helvetica').fontSize(9);
  doc.text('Signature of Applicant', contentLeft, y + 6, { width: colWidth - 20, align: 'center' });
  doc.text('Date Submitted', contentLeft + colWidth, y + 6, { width: colWidth - 20, align: 'center' });
  doc.text(MAYOR_TITLE, contentLeft + colWidth * 2, y + 6, { width: colWidth - 20, align: 'center' });
  console.log('[ApplicationFormPdf] drawing complete');
}

/**
 * Draws the CEAP application form, pre-filled from the applicant's
 * profile, and resolves with the finished PDF as a Buffer. Buffering
 * fully in memory (rather than piping straight to the HTTP response)
 * means a single-page form's worth of data (well under a memory
 * concern) and lets the route apply a hard timeout instead of risking
 * an indefinite hang reaching the client.
 */
export function generateApplicationFormPdf(applicant: Applicant, timeoutMs = 15000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`PDF generation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const doc = new PDFDocument({ layout: 'landscape', size: 'letter', margin: 30 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });

      draw(doc, applicant);
      doc.end();
    } catch (err) {
      clearTimeout(timer);
      reject(err as Error);
    }
  });
}
