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
    const where = { status: 'pending' as const };
    const [items, total] = await Promise.all([
      prisma.deletionRequest.findMany({
        where,
        include: withUsers,
        orderBy: { requestedAt: 'asc' },
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
