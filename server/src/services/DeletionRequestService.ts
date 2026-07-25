import type { DeletionRequest as PrismaDeletionRequest } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { DeletionRequest, DeletionEntityType, DeletionRequestStatus, PaginatedResponse, JWTPayload } from '../types.js';
import { NotificationService } from './NotificationService.js';

const notificationService = new NotificationService();

type DeletionRequestWithUsers = PrismaDeletionRequest & {
  requester: { email: string; firstName: string; lastName: string };
  reviewer: { email: string; firstName: string; lastName: string } | null;
};

function toDeletionRequest(record: DeletionRequestWithUsers): DeletionRequest {
  return {
    id: record.id,
    entityType: record.entityType as unknown as DeletionEntityType,
    entityId: record.entityId,
    entityLabel: record.entityLabel,
    requestedBy: record.requestedBy,
    requestedAt: record.requestedAt,
    status: record.status as unknown as DeletionRequestStatus,
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: record.reviewedAt ?? undefined,
    reviewNote: record.reviewNote ?? undefined,
    requester: record.requester,
    reviewerUser: record.reviewer ?? undefined
  };
}

const withUsers = {
  requester: { select: { email: true, firstName: true, lastName: true } },
  reviewer: { select: { email: true, firstName: true, lastName: true } }
} as const;

/**
 * Holds an Admin's delete-something request until a Super Admin or
 * Deletion-Reviewer Admin approves or rejects it. This service only owns
 * the request record itself — it never touches Application/Scholar/User
 * rows directly. The actual deletion, on approval, is performed by
 * whichever entity service owns that logic (ApplicationService,
 * ScholarService, AuthService), orchestrated from routes.ts so this file
 * doesn't need to import all three (which would risk circular imports,
 * since those services import this one to create requests).
 */
export class DeletionRequestService {
  async create(actor: JWTPayload, entityType: DeletionEntityType, entityId: number, entityLabel: string): Promise<void> {
    await prisma.deletionRequest.create({
      data: {
        entityType: entityType as any,
        entityId,
        entityLabel,
        requestedBy: actor.sub,
        status: 'pending'
      }
    });

    notificationService
      .notifyReviewersOfDeletionRequest(actor, entityLabel, `${actor.email} requested deletion of ${entityLabel}.`)
      .catch((error) => console.error('[DeletionRequestService] Failed to notify reviewers', entityType, entityId, error));
  }

  async listPending(page = 1, pageSize = 50): Promise<PaginatedResponse<DeletionRequest>> {
    return this.list('pending', page, pageSize);
  }

  /**
   * Completed deletions — every Super Admin's direct delete (recorded via
   * recordImmediateDeletion, requestedBy === reviewedBy, both timestamps
   * equal) plus every Admin request a reviewer approved. This is the
   * Deletion Report's data source; it deliberately does NOT reuse the
   * generic audit-log middleware, since that only sees the HTTP call an
   * Admin's request makes (which never actually deletes anything) and has
   * no visibility into the separate moment a reviewer later approves it.
   */
  async listHistory(page = 1, pageSize = 50): Promise<PaginatedResponse<DeletionRequest>> {
    return this.list('approved', page, pageSize, 'reviewedAt');
  }

  private async list(
    status: 'pending' | 'approved' | 'rejected',
    page: number,
    pageSize: number,
    orderByField: 'requestedAt' | 'reviewedAt' = 'requestedAt'
  ): Promise<PaginatedResponse<DeletionRequest>> {
    const where = { status };
    const [items, total] = await Promise.all([
      prisma.deletionRequest.findMany({
        where,
        include: withUsers,
        orderBy: { [orderByField]: status === 'pending' ? 'asc' : 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.deletionRequest.count({ where })
    ]);

    return {
      data: items.map(toDeletionRequest),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Records a deletion a Super Admin performed directly (no approval
   * needed) so it still shows up in the Deletion Report alongside
   * reviewed Admin requests — requestedBy and reviewedBy are both the
   * same Super Admin, both timestamps the same moment.
   */
  async recordImmediateDeletion(
    actor: JWTPayload,
    entityType: DeletionEntityType,
    entityId: number,
    entityLabel: string
  ): Promise<void> {
    const now = new Date();
    await prisma.deletionRequest.create({
      data: {
        entityType: entityType as any,
        entityId,
        entityLabel,
        requestedBy: actor.sub,
        requestedAt: now,
        status: 'approved',
        reviewedBy: actor.sub,
        reviewedAt: now
      }
    });
  }

  async getById(id: number): Promise<DeletionRequest | null> {
    const record = await prisma.deletionRequest.findUnique({ where: { id }, include: withUsers });
    return record ? toDeletionRequest(record) : null;
  }

  async markApproved(id: number, reviewerId: number): Promise<void> {
    await prisma.deletionRequest.update({
      where: { id },
      data: { status: 'approved', reviewedBy: reviewerId, reviewedAt: new Date() }
    });
  }

  async markRejected(id: number, reviewerId: number, note?: string): Promise<void> {
    await prisma.deletionRequest.update({
      where: { id },
      data: { status: 'rejected', reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: note }
    });
  }
}
