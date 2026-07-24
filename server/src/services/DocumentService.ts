import { Readable } from 'stream';
import { PDFDocument as PDFLibDocument, StandardFonts, type PDFImage } from 'pdf-lib';
import type { UploadedDocument as PrismaUploadedDocument } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { supabaseAdmin, DOCUMENTS_BUCKET } from '../lib/supabase.js';
import { drive, DRIVE_FOLDER_ID } from '../lib/googleDrive.js';
import { ApplicationService } from './ApplicationService.js';
import { NotificationService } from './NotificationService.js';
import { UploadedDocument, DocumentVerificationStatus, JWTPayload, UserRole, NotificationType } from '../types.js';

// A4 in points (1/72in) — used as the standard page size for both the
// section-divider pages and any image pages in the merged documents PDF.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 40;

const applicationService = new ApplicationService();
const notificationService = new NotificationService();

interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export type DownloadResult =
  | { kind: 'stream'; stream: NodeJS.ReadableStream; mimeType: string; fileName: string }
  | { kind: 'redirect'; url: string };

function isPrivileged(user: JWTPayload): boolean {
  return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
}

// Broader visibility check used ONLY for read paths — see the matching
// comment in ApplicationService.ts. getOwnedDocument's bypass below is
// shared with delete() (a write), which adds its own explicit Viewer
// denial rather than relying on this staying narrow.
function canView(user: JWTPayload): boolean {
  return isPrivileged(user) || user.role === UserRole.VIEWER;
}

function toDocument(record: PrismaUploadedDocument): UploadedDocument {
  return {
    id: record.id,
    applicationId: record.applicationId ?? undefined,
    userId: record.userId,
    documentType: record.documentType ?? undefined,
    fileName: record.fileName,
    filePath: record.filePath,
    fileSize: record.fileSize ?? undefined,
    fileType: record.fileType ?? undefined,
    verificationStatus: record.verificationStatus as unknown as DocumentVerificationStatus,
    verifiedBy: record.verifiedBy ?? undefined,
    verifiedAt: record.verifiedAt ?? undefined,
    verificationNotes: record.verificationNotes ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export class DocumentService {
  /**
   * Uploads go to Google Drive (current storage provider). filePath is
   * still populated (with the same Drive file id) purely to satisfy the
   * column's existing NOT NULL constraint — googleDriveId is what the
   * rest of the service actually keys off of.
   */
  async upload(
    user: JWTPayload,
    applicationId: number | null,
    documentType: string,
    file: UploadFile
  ): Promise<UploadedDocument> {
    if (applicationId !== null) {
      // Reuses ApplicationService's row-level ownership check — a Student
      // can only attach documents to an application that resolves as
      // their own.
      const application = await applicationService.getById(user, applicationId);
      if (!application) {
        throw new Error('Application not found');
      }
    } else if (documentType === 'Valid ID') {
      // Profile-level Valid ID uploads are capped at 5 files, matching
      // the source form's "up to 5 files" limit.
      const existingCount = await prisma.uploadedDocument.count({
        where: { userId: user.sub, applicationId: null, documentType: 'Valid ID' }
      });
      if (existingCount >= 5) {
        throw new Error('You can only upload up to 5 Valid ID files');
      }
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const driveFile = await drive.files.create({
      requestBody: {
        name: `${applicationId !== null ? `application-${applicationId}` : 'profile'}-${Date.now()}-${safeName}`,
        parents: DRIVE_FOLDER_ID ? [DRIVE_FOLDER_ID] : undefined
      },
      media: {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer)
      },
      fields: 'id'
    });

    const fileId = driveFile.data.id;
    if (!fileId) {
      throw new Error('Upload failed: Google Drive did not return a file id');
    }

    const created = await prisma.uploadedDocument.create({
      data: {
        applicationId,
        userId: user.sub,
        documentType,
        fileName: file.originalname,
        filePath: fileId,
        googleDriveId: fileId,
        fileSize: file.size,
        fileType: file.mimetype,
        verificationStatus: 'pending'
      }
    });

    return toDocument(created);
  }

  /**
   * Documents relevant to reviewing this application: anything actually
   * attached to the application record itself, plus the applicant's
   * profile-level uploads (Valid ID, Grades, etc.) — which is where every
   * document is uploaded today (ProfileDocuments/ValidIdUpload always
   * omit applicationId, reused across every application the student
   * makes). Without the profile-level half, an admin reviewing an
   * application would see no documents at all.
   */
  async listByApplication(user: JWTPayload, applicationId: number): Promise<UploadedDocument[]> {
    const application = await applicationService.getById(user, applicationId);
    if (!application) return [];

    const applicant = await prisma.applicant.findUnique({
      where: { id: application.applicantId },
      select: { userId: true }
    });

    const docs = await prisma.uploadedDocument.findMany({
      where: {
        OR: [{ applicationId }, ...(applicant ? [{ userId: applicant.userId, applicationId: null }] : [])]
      },
      orderBy: { createdAt: 'asc' }
    });
    return docs.map(toDocument);
  }

  /**
   * Profile-level documents (Valid ID, ATM card, etc.) — always
   * self-scoped by construction, no ownership branch needed.
   */
  async listMyProfileDocuments(user: JWTPayload): Promise<UploadedDocument[]> {
    const docs = await prisma.uploadedDocument.findMany({
      where: { userId: user.sub, applicationId: null },
      orderBy: { createdAt: 'asc' }
    });
    return docs.map(toDocument);
  }

  /**
   * Drive documents are streamed directly through our own server (never a
   * public Drive link, so access stays gated behind our own auth/ownership
   * check). Legacy pre-migration documents fall back to a short-lived
   * Supabase signed URL, which the route redirects to.
   */
  async getDownload(user: JWTPayload, documentId: number): Promise<DownloadResult> {
    const doc = await this.getOwnedDocument(user, documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    if (doc.googleDriveId) {
      const response = await drive.files.get(
        { fileId: doc.googleDriveId, alt: 'media' },
        { responseType: 'stream' }
      );
      return {
        kind: 'stream',
        stream: response.data,
        mimeType: doc.fileType || 'application/octet-stream',
        fileName: doc.fileName
      };
    }

    const { data, error } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.filePath, 60 * 5);
    if (error || !data) {
      throw new Error('Failed to generate download link');
    }
    return { kind: 'redirect', url: data.signedUrl };
  }

  async verify(
    user: JWTPayload,
    documentId: number,
    status: DocumentVerificationStatus,
    notes?: string
  ): Promise<UploadedDocument | undefined> {
    if (!isPrivileged(user)) {
      throw new Error('Not authorized to verify documents');
    }

    try {
      const updated = await prisma.uploadedDocument.update({
        where: { id: documentId },
        data: {
          verificationStatus: status as any,
          verifiedBy: user.sub,
          verifiedAt: new Date(),
          verificationNotes: notes
        }
      });

      notificationService
        .create(
          updated.userId,
          NotificationType.SYSTEM_NOTIFICATION,
          'Document Reviewed',
          `Your document "${updated.documentType ?? 'upload'}" was marked ${status.replace(/_/g, ' ')}.`,
          '/my-application'
        )
        .catch((error) => console.error('[NotificationService] Failed to notify document owner', updated.id, error));

      return toDocument(updated);
    } catch {
      return undefined;
    }
  }

  /**
   * Lets a Student remove their own upload (e.g. they picked the wrong
   * file) — also lets an Admin remove one during review. Deletes the
   * remote file first; if that fails we don't touch the DB row, so the
   * two stay consistent.
   */
  async delete(user: JWTPayload, documentId: number): Promise<boolean> {
    if (user.role === UserRole.VIEWER) {
      throw new Error('Viewers do not have permission to delete documents');
    }
    const doc = await this.getOwnedDocument(user, documentId);
    if (!doc) return false;

    if (doc.googleDriveId) {
      try {
        await drive.files.delete({ fileId: doc.googleDriveId });
      } catch (error: any) {
        // Already gone on Drive (e.g. manually deleted) — fine to proceed
        // and clean up our own row; anything else is a real failure.
        if (error?.code !== 404) {
          throw new Error(`Failed to delete file: ${error.message}`);
        }
      }
    } else {
      const { error: storageError } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove([doc.filePath]);
      if (storageError) {
        throw new Error(`Failed to delete file: ${storageError.message}`);
      }
    }

    await prisma.uploadedDocument.delete({ where: { id: documentId } });
    return true;
  }

  /**
   * Row-level ownership check for a single document: a Student only ever
   * gets a document back if they're the one who uploaded it.
   */
  private async getOwnedDocument(user: JWTPayload, documentId: number): Promise<PrismaUploadedDocument | null> {
    if (canView(user)) {
      return prisma.uploadedDocument.findUnique({ where: { id: documentId } });
    }
    return prisma.uploadedDocument.findFirst({ where: { id: documentId, userId: user.sub } });
  }

  /**
   * Admin/Super Admin only — lists a specific applicant's profile-level
   * documentary requirement uploads, for the "browse by applicant" admin view.
   */
  async listProfileDocumentsForUser(user: JWTPayload, targetUserId: number): Promise<UploadedDocument[]> {
    if (!canView(user)) {
      throw new Error('Not authorized to view this user\'s documents');
    }

    const docs = await prisma.uploadedDocument.findMany({
      where: { userId: targetUserId, applicationId: null },
      orderBy: { documentType: 'asc' }
    });
    return docs.map(toDocument);
  }

  /**
   * Raw file bytes regardless of storage backend — unlike getDownload
   * (which streams/redirects for HTTP serving), this is for local
   * in-memory processing (merging into one PDF below).
   */
  private async fetchFileBytes(doc: PrismaUploadedDocument): Promise<Buffer> {
    if (doc.googleDriveId) {
      const response = await drive.files.get(
        { fileId: doc.googleDriveId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      return Buffer.from(response.data as ArrayBuffer);
    }

    const { data, error } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).download(doc.filePath);
    if (error || !data) {
      throw new Error(`Failed to download file: ${doc.fileName}`);
    }
    return Buffer.from(await data.arrayBuffer());
  }

  private addImagePage(pdf: PDFLibDocument, image: PDFImage): void {
    const maxWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
    const maxHeight = PAGE_HEIGHT - PAGE_MARGIN * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;

    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawImage(image, { x: (PAGE_WIDTH - width) / 2, y: (PAGE_HEIGHT - height) / 2, width, height });
  }

  /**
   * Admin/Super Admin only — merges every one of an applicant's
   * profile-level documentary requirement uploads into a single
   * downloadable PDF, preceded by a section-divider page per document so
   * the packet stays navigable. PDFs are merged page-for-page; images
   * become their own page, scaled to fit. A file that fails to fetch or
   * embed (e.g. corrupted upload, or its declared mimetype doesn't match
   * its actual bytes) is skipped rather than failing the whole bundle.
   */
  async getMergedProfileDocumentsPdf(user: JWTPayload, targetUserId: number): Promise<{ buffer: Buffer; fileName: string }> {
    if (!canView(user)) {
      throw new Error('Not authorized to bundle this user\'s documents');
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw new Error('User not found');
    }

    const docs = await prisma.uploadedDocument.findMany({
      where: { userId: targetUserId, applicationId: null },
      orderBy: { documentType: 'asc' }
    });
    if (docs.length === 0) {
      throw new Error('This user has not uploaded any documents yet');
    }

    const merged = await PDFLibDocument.create();
    const font = await merged.embedFont(StandardFonts.HelveticaBold);

    for (const doc of docs) {
      let bytes: Buffer;
      try {
        bytes = await this.fetchFileBytes(doc);
      } catch (error) {
        console.error(`[DocumentService] Failed to fetch bytes for document ${doc.id} while merging`, error);
        continue;
      }

      const divider = merged.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      divider.drawText(doc.documentType ?? 'Document', { x: PAGE_MARGIN, y: PAGE_HEIGHT - 100, size: 20, font });
      divider.drawText(doc.fileName, { x: PAGE_MARGIN, y: PAGE_HEIGHT - 130, size: 10, font });

      try {
        const mimeType = (doc.fileType || '').toLowerCase();
        if (mimeType === 'application/pdf') {
          const src = await PDFLibDocument.load(bytes, { ignoreEncryption: true });
          const pages = await merged.copyPages(src, src.getPageIndices());
          pages.forEach((page) => merged.addPage(page));
        } else if (mimeType === 'image/png') {
          this.addImagePage(merged, await merged.embedPng(bytes));
        } else {
          // Covers image/jpeg and image/jpg — the only other types
          // upload.ts's fileFilter allows through.
          this.addImagePage(merged, await merged.embedJpg(bytes));
        }
      } catch (error) {
        console.error(`[DocumentService] Failed to embed document ${doc.id} while merging`, error);
      }
    }

    const bytes = await merged.save();
    const fileName = `${target.firstName}-${target.lastName}-Documentary-Requirements.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
    return { buffer: Buffer.from(bytes), fileName };
  }
}
