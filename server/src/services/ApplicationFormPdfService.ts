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

/**
 * Draws the CEAP application form, pre-filled from the applicant's
 * profile, and pipes the finished PDF to the given writable stream.
 * Signature/date lines and the Mayor's name are left as static
 * form elements — those aren't profile data.
 */
export function generateApplicationFormPdf(applicant: Applicant): PDFKit.PDFDocument {
  const doc = new PDFDocument({ layout: 'landscape', size: 'letter', margin: 30 });
  const pageWidth = doc.page.width;
  const contentLeft = 30;
  const contentWidth = pageWidth - 60;

  // ---------- Header ----------
  try {
    doc.image(CONNER_SEAL_PATH, contentLeft, 20, { width: 65, height: 65 });
  } catch {
    // Missing asset shouldn't block PDF generation — just skip the image.
  }
  try {
    doc.image(BAGONG_PILIPINAS_PATH, pageWidth - 30 - 70, 15, { width: 70, height: 70 });
  } catch {
    // Same as above.
  }

  doc.font('Helvetica-Bold').fontSize(11).text('REPUBLIC OF THE PHILIPPINES', 0, 22, { align: 'center', width: pageWidth });
  doc.text('PROVINCE OF APAYAO', 0, 35, { align: 'center', width: pageWidth });
  doc.text('MUNICIPALITY OF CONNER', 0, 48, { align: 'center', width: pageWidth });
  doc.fontSize(16).text('CONNER EDUCATIONAL ASSISTANCE PROGRAM (CEAP)', 0, 65, { align: 'center', width: pageWidth });
  doc.fontSize(13).text('SPECIAL COURSE', 0, 85, { align: 'center', width: pageWidth });

  doc.moveTo(contentLeft, 110).lineTo(pageWidth - 30, 110).lineWidth(1).stroke();

  // ---------- Field boxes ----------
  const idBoxWidth = 130;
  const formWidth = contentWidth - idBoxWidth - 15;
  let y = 122;

  const box = (label: string, height: number, draw: (x: number, y: number, w: number) => void) => {
    doc.roundedRect(contentLeft, y, formWidth, height, 4).stroke();
    doc.font('Helvetica-Bold').fontSize(10).text(label, contentLeft + 8, y + 6);
    draw(contentLeft + 8, y + 6, formWidth - 16);
    y += height + 6;
  };

  box('NAME:', 40, (x, ty, w) => {
    const nameLabelWidth = 45;
    const nameX = x + nameLabelWidth;
    const nameW = w - nameLabelWidth;
    const cols = [
      { value: applicant.firstName, offset: 0 },
      { value: applicant.middleName ?? '', offset: 0.32 },
      { value: applicant.lastName, offset: 0.6 },
      { value: applicant.suffix ?? '', offset: 0.85 }
    ];
    for (const col of cols) {
      value(doc, col.value, nameX + nameW * col.offset, ty, nameW * 0.28);
    }
    doc.moveTo(x, ty + 20).lineTo(x + w, ty + 20).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7);
    doc.text('(FIRST NAME)', x, ty + 23);
    doc.text('(MIDDLE NAME)', x + w * 0.3, ty + 23);
    doc.text('(LAST NAME)', x + w * 0.58, ty + 23);
    doc.text('(EXT. NAME)', x + w * 0.85, ty + 23);
  });

  const address = joinNonEmpty([applicant.address, applicant.barangay, applicant.municipality, applicant.province]);
  box('ADDRESS:', 26, (x, ty, w) => {
    value(doc, address, x + 60, ty, w - 60);
  });

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
    const courseBoxWidth = formWidth * 0.68;
    const mobileBoxWidth = formWidth - courseBoxWidth - 8;

    doc.roundedRect(contentLeft, y, courseBoxWidth, rowHeight, 4).stroke();
    doc.font('Helvetica-Bold').fontSize(10).text('COURSE:', contentLeft + 8, y + 6);
    value(doc, applicant.courseName ?? '', contentLeft + 8 + 55, y + 6, courseBoxWidth * 0.55 - 55);
    doc.font('Helvetica-Bold').text('YEAR:', contentLeft + courseBoxWidth * 0.6, y + 6);
    value(doc, applicant.yearLevel ?? '', contentLeft + courseBoxWidth * 0.6 + 38, y + 6, courseBoxWidth * 0.4 - 38);

    const mobileBoxX = contentLeft + courseBoxWidth + 8;
    doc.roundedRect(mobileBoxX, y, mobileBoxWidth, rowHeight, 4).stroke();
    doc.font('Helvetica-Bold').fontSize(10).text('MOBILE NO.:', mobileBoxX + 8, y + 6);
    value(doc, applicant.contactNumber ?? '', mobileBoxX + 8, y + 18, mobileBoxWidth - 16);

    y += rowHeight + 6;
  }

  box("FATHER'S NAME:", 26, (x, ty, w) => {
    value(doc, applicant.father?.name ?? '', x + 95, ty, w * 0.55 - 95);
    doc.font('Helvetica-Bold').fontSize(10).text('OCCUPATION:', x + w * 0.6, ty);
    value(doc, applicant.father?.occupation ?? '', x + w * 0.6 + 80, ty, w * 0.4 - 80);
  });

  box("MOTHER'S NAME:", 26, (x, ty, w) => {
    value(doc, applicant.mother?.name ?? '', x + 95, ty, w * 0.55 - 95);
    doc.font('Helvetica-Bold').fontSize(10).text('OCCUPATION:', x + w * 0.6, ty);
    value(doc, applicant.mother?.occupation ?? '', x + w * 0.6 + 80, ty, w * 0.4 - 80);
  });

  box("GUARDIAN'S NAME:", 26, (x, ty, w) => {
    value(doc, applicant.guardian?.name ?? '', x + 105, ty, w * 0.45 - 105);
    doc.font('Helvetica-Bold').fontSize(10).text('RELATIONSHIP:', x + w * 0.48, ty);
    // Left blank — relationship isn't captured in the profile; filled in by hand.
    doc.font('Helvetica-Bold').text('OCCUPATION:', x + w * 0.72, ty);
    value(doc, applicant.guardian?.occupation ?? '', x + w * 0.72 + 80, ty, w * 0.28 - 80);
  });

  // ---------- 2x2 ID picture box ----------
  doc
    .roundedRect(contentLeft + formWidth + 15, 122, idBoxWidth, 220, 4)
    .stroke();
  doc
    .font('Helvetica')
    .fontSize(10)
    .text('LATEST 2X2 ID PICTURE', contentLeft + formWidth + 15, 122 + 100, { width: idBoxWidth, align: 'center' });

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

  doc.end();
  return doc;
}
