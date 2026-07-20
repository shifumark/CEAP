import { Readable } from 'stream';
import type { UploadedDocument as PrismaUploadedDocument } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { supabaseAdmin, DOCUMENTS_BUCKET } from '../lib/supabase.js';
import { drive, DRIVE_FOLDER_ID } from '../lib/googleDrive.js';
import { ApplicationService } from './ApplicationService.js';
import { NotificationService } from './NotificationService.js';
import { UploadedDocument, DocumentVerificationStatus, JWTPayload, UserRole, NotificationType } from '../types.js';

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
    if (isPrivileged(user)) {
      return prisma.uploadedDocument.findUnique({ where: { id: documentId } });
    }
    return prisma.uploadedDocument.findFirst({ where: { id: documentId, userId: user.sub } });
  }
}
