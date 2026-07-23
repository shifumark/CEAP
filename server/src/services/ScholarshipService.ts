import { Prisma } from '@prisma/client';
import type { ScholarshipProgram as PrismaScholarshipProgram } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  ScholarshipProgram,
  CreateScholarshipProgramRequest,
  UpdateScholarshipProgramRequest,
  PaginatedResponse,
  ScholarFilters,
  RequiredDocument
} from '../types.js';
import { NotificationService } from './NotificationService.js';

const notificationService = new NotificationService();

function toProgram(record: PrismaScholarshipProgram): ScholarshipProgram {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? '',
    sponsor: record.sponsor ?? '',
    benefits: record.benefits ?? '',
    numberOfSlots: record.numberOfSlots ?? 0,
    maxApplicants: record.maxApplicants ?? 0,
    eligibilityRequirements: record.eligibilityRequirements ?? '',
    openingDate: record.openingDate ?? record.createdAt,
    closingDate: record.closingDate ?? record.createdAt,
    academicYear: record.academicYear ?? '',
    status: record.status,
    createdBy: record.createdBy ?? 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

/**
 * Scholarship Program Service
 * Manages scholarship program creation, retrieval, and updates
 */
export class ScholarshipService {
  async createProgram(userId: number, request: CreateScholarshipProgramRequest): Promise<ScholarshipProgram> {
    const created = await prisma.scholarshipProgram.create({
      data: {
        name: request.name,
        description: request.description,
        sponsor: request.sponsor,
        benefits: request.benefits,
        numberOfSlots: request.numberOfSlots,
        maxApplicants: request.maxApplicants,
        eligibilityRequirements: request.eligibilityRequirements,
        openingDate: new Date(request.openingDate),
        closingDate: new Date(request.closingDate),
        academicYear: request.academicYear,
        status: 'active',
        createdBy: userId,
        requiredDocuments: request.requiredDocuments
          ? {
              create: request.requiredDocuments.map((documentType) => ({ documentType }))
            }
          : undefined
      }
    });

    notificationService.broadcastNewProgram(created.name).catch((error) => {
      console.error('[NotificationService] Failed to broadcast new program', created.id, error);
    });

    return toProgram(created);
  }

  // No dedicated scheduler in this app's infra, so expiry is enforced
  // lazily: every read path closes any active program whose closingDate
  // has passed before returning results. A single bulk updateMany rather
  // than a loop — cheap even called on every list/detail fetch.
  private async autoCloseExpiredPrograms(onlyId?: number): Promise<void> {
    await prisma.scholarshipProgram.updateMany({
      where: {
        status: 'active',
        closingDate: { lt: new Date() },
        ...(onlyId !== undefined ? { id: onlyId } : {})
      },
      data: { status: 'closed' }
    });
  }

  async getPrograms(filters?: ScholarFilters): Promise<PaginatedResponse<ScholarshipProgram>> {
    await this.autoCloseExpiredPrograms();

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const where = filters?.status ? { status: filters.status } : {};

    const [items, total] = await Promise.all([
      prisma.scholarshipProgram.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' }
      }),
      prisma.scholarshipProgram.count({ where })
    ]);

    return {
      data: items.map(toProgram),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async getProgramById(id: number): Promise<ScholarshipProgram | undefined> {
    await this.autoCloseExpiredPrograms(id);
    const program = await prisma.scholarshipProgram.findUnique({ where: { id } });
    return program ? toProgram(program) : undefined;
  }

  async updateProgram(
    id: number,
    request: UpdateScholarshipProgramRequest
  ): Promise<ScholarshipProgram | undefined> {
    try {
      // Built field-by-field from an explicit whitelist rather than
      // spreading `request` — req.body is untyped at runtime, so a raw
      // request could otherwise smuggle in columns like `createdBy`.
      const data: Prisma.ScholarshipProgramUpdateInput = {
        name: request.name,
        description: request.description,
        sponsor: request.sponsor,
        benefits: request.benefits,
        eligibilityRequirements: request.eligibilityRequirements,
        academicYear: request.academicYear,
        status: request.status,
        numberOfSlots: request.numberOfSlots,
        maxApplicants: request.maxApplicants,
        // Date fields arrive as plain strings (matching createProgram's
        // request shape) — Prisma needs real Date objects, and this
        // previously passed the raw string straight through whenever a
        // caller updated a date (a latent bug — no existing caller
        // touched dates via this path until the +/- extension feature
        // and the edit form started sending them).
        openingDate: request.openingDate !== undefined ? new Date(request.openingDate) : undefined,
        closingDate: request.closingDate !== undefined ? new Date(request.closingDate) : undefined,
        // Comma-separated field in the edit form — a full replace rather
        // than an incremental add/delete, matching how it works at creation.
        requiredDocuments:
          request.requiredDocuments !== undefined
            ? {
                deleteMany: {},
                create: request.requiredDocuments.map((documentType) => ({ documentType }))
              }
            : undefined
      };

      const updated = await prisma.scholarshipProgram.update({
        where: { id },
        data
      });
      return toProgram(updated);
    } catch {
      return undefined;
    }
  }

  // Deletes a program along with everything tied to it, even if
  // applications or scholars already exist. Applications and Scholars
  // reference scholarshipId without an onDelete cascade at the DB level
  // (deliberately, so a plain delete fails loudly in the normal case) —
  // this explicitly clears them first, in FK-safe order, inside a
  // transaction. Their own children (status history, uploaded documents,
  // grades, renewals, allowances, violations) cascade automatically once
  // the Application/Scholar row itself is gone.
  async deleteProgram(id: number): Promise<boolean> {
    try {
      await prisma.$transaction([
        prisma.application.deleteMany({ where: { scholarshipId: id } }),
        prisma.scholar.deleteMany({ where: { scholarshipId: id } }),
        prisma.scholarshipProgram.delete({ where: { id } })
      ]);
      return true;
    } catch (error: any) {
      if (error?.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  async getProgramStats(): Promise<any> {
    const [activePrograms, totalPrograms, slotAgg] = await Promise.all([
      prisma.scholarshipProgram.count({ where: { status: 'active' } }),
      prisma.scholarshipProgram.count(),
      prisma.scholarshipProgram.aggregate({ _sum: { numberOfSlots: true } })
    ]);

    return {
      activePrograms,
      closedPrograms: totalPrograms - activePrograms,
      totalPrograms,
      totalSlots: slotAgg._sum.numberOfSlots ?? 0
    };
  }

  async getRequiredDocuments(scholarshipId: number): Promise<RequiredDocument[]> {
    const docs = await prisma.requiredDocument.findMany({
      where: { scholarshipId },
      orderBy: { id: 'asc' }
    });

    return docs.map((d) => ({
      id: d.id,
      scholarshipId: d.scholarshipId,
      documentType: d.documentType,
      description: d.description ?? '',
      isRequired: d.isRequired,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));
  }
}
