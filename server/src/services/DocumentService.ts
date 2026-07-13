import type { UploadedDocument as PrismaUploadedDocument } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { supabaseAdmin, DOCUMENTS_BUCKET } from '../lib/supabase.js';
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
  async upload(
    user: JWTPayload,
    applicationId: number,
    documentType: string,
    file: UploadFile
  ): Promise<UploadedDocument> {
    // Reuses ApplicationService's row-level ownership check — a Student can
    // only attach documents to an application that resolves as their own.
    const application = await applicationService.getById(user, applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `applications/${applicationId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const created = await prisma.uploadedDocument.create({
      data: {
        applicationId,
        userId: user.sub,
        documentType,
        fileName: file.originalname,
        filePath: storagePath,
        fileSize: file.size,
        fileType: file.mimetype,
        verificationStatus: 'pending'
      }
    });

    return toDocument(created);
  }

  async listByApplication(user: JWTPayload, applicationId: number): Promise<UploadedDocument[]> {
    const application = await applicationService.getById(user, applicationId);
    if (!application) return [];

    const docs = await prisma.uploadedDocument.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' }
    });
    return docs.map(toDocument);
  }

  async getSignedUrl(user: JWTPayload, documentId: number): Promise<string> {
    const doc = await this.getOwnedDocument(user, documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const { data, error } = await supabaseAdmin.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(doc.filePath, 60 * 5);

    if (error || !data) {
      throw new Error('Failed to generate download link');
    }

    return data.signedUrl;
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
   * Storage object first; if that fails we don't touch the DB row, so
   * the two stay consistent.
   */
  async delete(user: JWTPayload, documentId: number): Promise<boolean> {
    const doc = await this.getOwnedDocument(user, documentId);
    if (!doc) return false;

    const { error: storageError } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove([doc.filePath]);
    if (storageError) {
      throw new Error(`Failed to delete file: ${storageError.message}`);
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
