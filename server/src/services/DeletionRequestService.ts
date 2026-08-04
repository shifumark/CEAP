import type { DeletionRequest as PrismaDeletionRequest } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { DeletionRequest, DeletionEntityType, DeletionRequestStatus, PaginatedResponse, JWTPayload } from '../types.js';
import { NotificationService } from './NotificationService.js';

const notificationService = new NotificationService();

type DeletionRequestWithUsers = PrismaDeletionRequest & {
  requester: { email: string; firstName: string; lastName: string } | null;
  reviewer: { email: string; firstName: string; lastName: string } | null;
};

function toDeletionRequest(record: DeletionRequestWithUsers): DeletionRequest {
  return {
    id: record.id,
    entityType: record.entityType as unknown as DeletionEntityType,
    entityId: record.entityId,
    entityLabel: record.entityLabel,
    requestedBy: record.requestedBy ?? undefined,
    requestedAt: record.requestedAt,
    status: record.status as unknown as DeletionRequestStatus,
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: record.reviewedAt ?? undefined,
    reviewNote: record.reviewNote ?? undefined,
    requester: record.requester ?? undefined,
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

  /**
   * Atomically claims a pending request as approved — the WHERE clause is
   * scoped to status: 'pending', not just id, so this is a
   * compare-and-swap rather than a plain update. Two reviewers acting on
   * the same request at nearly the same instant (one clicking Approve
   * while another clicks Reject, or a double-click on Approve) can both
   * read status === 'pending' before either write lands; without this
   * guard both could proceed — one performing the actual entity deletion,
   * the other flipping the request to 'rejected' afterward, leaving the
   * entity gone but the request's own record calling it rejected. Only
   * the call that actually flips pending -> approved returns true; the
   * caller must treat a false return as "someone else already reviewed
   * this" and must not perform the underlying deletion.
   */
  async markApproved(id: number, reviewerId: number): Promise<boolean> {
    const result = await prisma.deletionRequest.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'approved', reviewedBy: reviewerId, reviewedAt: new Date() }
    });
    return result.count > 0;
  }

  /** Same compare-and-swap guard as markApproved, for the reject path. */
  async markRejected(id: number, reviewerId: number, note?: string): Promise<boolean> {
    const result = await prisma.deletionRequest.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'rejected', reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: note }
    });
    return result.count > 0;
  }

  /**
   * Reverts a request this reviewer just claimed via markApproved back to
   * 'pending' — used when the underlying deletion itself then failed
   * (e.g. a remote storage error), so the request stays retryable instead
   * of getting stuck showing "approved" with nothing actually deleted.
   */
  async revertToPending(id: number): Promise<void> {
    await prisma.deletionRequest.update({
      where: { id },
      data: { status: 'pending', reviewedBy: null, reviewedAt: null }
    });
  }
}
