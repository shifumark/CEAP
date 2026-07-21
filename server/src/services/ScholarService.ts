import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  Scholar,
  Grade,
  Renewal,
  Allowance,
  Violation,
  ScholarStatus,
  RenewalStatus,
  SubmitGradeRequest,
  CreateRenewalRequest,
  ReviewRenewalRequest,
  CreateAllowanceRequest,
  CreateViolationRequest,
  ScholarFilters,
  PaginatedResponse,
  JWTPayload,
  UserRole,
  NotificationType
} from '../types.js';
import { NotificationService } from './NotificationService.js';

const notificationService = new NotificationService();

const scholarInclude = {
  scholarship: true,
  user: { include: { applicant: true } }
} satisfies Prisma.ScholarInclude;

type ScholarWithRelations = Prisma.ScholarGetPayload<{ include: typeof scholarInclude }>;

function isPrivileged(user: JWTPayload): boolean {
  return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
}

function toScholar(record: ScholarWithRelations, submissionDate?: Date): Scholar {
  return {
    id: record.id,
    userId: record.userId,
    scholarshipId: record.scholarshipId,
    scholarIdNumber: record.scholarIdNumber ?? undefined,
    approvalDate: record.approvalDate ?? undefined,
    qrCode: record.qrCode ?? undefined,
    status: record.status as unknown as ScholarStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    scholarshipName: record.scholarship?.name,
    studentName: record.user ? `${record.user.firstName} ${record.user.lastName}` : undefined,
    studentEmail: record.user?.email,
    studentBarangay: record.user?.applicant?.barangay ?? undefined,
    // Fallback for scholars whose location was entered as free text under
    // the legacy `address` field instead of the structured barangay field —
    // the Barangay search matches against this too, so those records are
    // still findable.
    studentAddress: record.user?.applicant?.address ?? undefined,
    submissionDate
  };
}

function toGrade(record: Prisma.GradeGetPayload<{}>): Grade {
  return {
    id: record.id,
    scholarId: record.scholarId,
    academicYear: record.academicYear ?? undefined,
    semester: record.semester ?? undefined,
    gpa: record.gpa ? record.gpa.toNumber() : undefined,
    subjectDetails: record.subjectDetails ?? undefined,
    uploadedBy: record.uploadedBy ?? undefined,
    uploadedAt: record.uploadedAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function toRenewal(record: Prisma.RenewalGetPayload<{}>): Renewal {
  return {
    id: record.id,
    scholarId: record.scholarId,
    academicYear: record.academicYear ?? undefined,
    semester: record.semester ?? undefined,
    status: record.status as unknown as RenewalStatus,
    submissionDate: record.submissionDate ?? undefined,
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: record.reviewedAt ?? undefined,
    decision: record.decision ?? undefined,
    notes: record.notes ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function toAllowance(record: Prisma.AllowanceGetPayload<{}>): Allowance {
  return {
    id: record.id,
    scholarId: record.scholarId,
    academicYear: record.academicYear ?? undefined,
    semester: record.semester ?? undefined,
    amount: record.amount.toNumber(),
    paymentDate: record.paymentDate ?? undefined,
    status: record.status as unknown as Allowance['status'],
    releaseDate: record.releaseDate ?? undefined,
    notes: record.notes ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function toViolation(record: Prisma.ViolationGetPayload<{}>): Violation {
  return {
    id: record.id,
    scholarId: record.scholarId,
    violationType: record.violationType ?? undefined,
    description: record.description ?? undefined,
    severity: (record.severity as unknown as Violation['severity']) ?? undefined,
    actionTaken: record.actionTaken ?? undefined,
    resolved: record.resolved,
    resolvedDate: record.resolvedDate ?? undefined,
    createdBy: record.createdBy ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export class ScholarService {
  /**
   * Called when an application is approved. Idempotent: a user can only
   * ever have one Scholar record (matches the DB's unique userId), so a
   * second approval for the same person just returns the existing one.
   */
  async createFromApprovedApplication(userId: number, scholarshipId: number): Promise<Scholar> {
    const existing = await prisma.scholar.findUnique({ where: { userId }, include: scholarInclude });
    if (existing) return toScholar(existing);

    const created = await prisma.scholar.create({
      data: { userId, scholarshipId, approvalDate: new Date(), status: 'active' }
    });

    const scholarIdNumber = `SCH-${new Date().getFullYear()}-${String(created.id).padStart(5, '0')}`;
    const updated = await prisma.scholar.update({
      where: { id: created.id },
      data: { scholarIdNumber },
      include: scholarInclude
    });

    return toScholar(updated);
  }

  async getMyRecord(user: JWTPayload): Promise<Scholar | undefined> {
    const record = await prisma.scholar.findUnique({ where: { userId: user.sub }, include: scholarInclude });
    return record ? toScholar(record) : undefined;
  }

  async listScholars(user: JWTPayload, filters?: ScholarFilters): Promise<PaginatedResponse<Scholar>> {
    if (!isPrivileged(user)) {
      throw new Error('Not authorized to list scholars');
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const where: Prisma.ScholarWhereInput = {};
    if (filters?.status) where.status = filters.status as any;
    if (filters?.scholarshipId) where.scholarshipId = filters.scholarshipId;

    const [items, total] = await Promise.all([
      prisma.scholar.findMany({
        where,
        include: scholarInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' }
      }),
      prisma.scholar.count({ where })
    ]);

    // Scholar has no direct applicationId FK, so the originating
    // application's submissionDate (used to order scholars within a
    // program by who submitted first) is looked up separately, keyed by
    // (applicantId, scholarshipId) — a single bulk query rather than N+1.
    const applicantIds = items
      .map((item) => item.user?.applicant?.id)
      .filter((id): id is number => id !== undefined);

    const applications = applicantIds.length
      ? await prisma.application.findMany({
          where: { applicantId: { in: applicantIds }, status: 'approved' },
          select: { applicantId: true, scholarshipId: true, submissionDate: true }
        })
      : [];

    const submissionDateByKey = new Map<string, Date | null>();
    for (const app of applications) {
      const key = `${app.applicantId}:${app.scholarshipId}`;
      const existing = submissionDateByKey.get(key);
      if (existing === undefined || (app.submissionDate && (!existing || app.submissionDate < existing))) {
        submissionDateByKey.set(key, app.submissionDate);
      }
    }

    return {
      data: items.map((item) => {
        const applicantId = item.user?.applicant?.id;
        const submissionDate =
          applicantId !== undefined ? submissionDateByKey.get(`${applicantId}:${item.scholarshipId}`) ?? undefined : undefined;
        return toScholar(item, submissionDate);
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Row-level ownership check: a Student only ever gets their own scholar
   * record back; a mismatched id resolves to undefined (404), not a leak.
   */
  async getById(user: JWTPayload, id: number): Promise<Scholar | undefined> {
    const record = isPrivileged(user)
      ? await prisma.scholar.findUnique({ where: { id }, include: scholarInclude })
      : await prisma.scholar.findFirst({ where: { id, userId: user.sub }, include: scholarInclude });
    return record ? toScholar(record) : undefined;
  }

  /**
   * Deletes both the Scholar record and the approved Application that
   * created it (looked up the same way as the submissionDate join above,
   * since Scholar has no direct applicationId FK). Each side's own
   * children cascade automatically at the DB level once the parent row
   * is gone — grades/renewals/allowances/violations for the Scholar,
   * status history and application-scoped documents for the Application.
   */
  async deleteScholar(user: JWTPayload, scholarId: number): Promise<boolean> {
    if (!isPrivileged(user)) {
      throw new Error('Not authorized to delete scholars');
    }

    const scholar = await prisma.scholar.findUnique({
      where: { id: scholarId },
      include: { user: { include: { applicant: true } } }
    });
    if (!scholar) return false;

    const applicantId = scholar.user?.applicant?.id;

    await prisma.$transaction(async (tx) => {
      if (applicantId !== undefined) {
        await tx.application.deleteMany({
          where: { applicantId, scholarshipId: scholar.scholarshipId, status: 'approved' }
        });
      }
      await tx.scholar.delete({ where: { id: scholarId } });
    });

    return true;
  }

  // ---------------- Grades ----------------

  async submitGrade(user: JWTPayload, request: SubmitGradeRequest): Promise<Grade> {
    if (!isPrivileged(user)) {
      throw new Error('Not authorized to submit grades');
    }

    const created = await prisma.grade.create({
      data: {
        scholarId: request.scholarId,
        academicYear: request.academicYear,
        semester: request.semester,
        gpa: request.gpa,
        subjectDetails: request.subjectDetails,
        uploadedBy: user.sub,
        uploadedAt: new Date()
      }
    });

    return toGrade(created);
  }

  async listGrades(user: JWTPayload, scholarId: number): Promise<Grade[]> {
    const scholar = await this.getById(user, scholarId);
    if (!scholar) return [];

    const grades = await prisma.grade.findMany({ where: { scholarId }, orderBy: { createdAt: 'desc' } });
    return grades.map(toGrade);
  }

  // ---------------- Renewals ----------------

  async requestRenewal(user: JWTPayload, request: CreateRenewalRequest): Promise<Renewal> {
    const scholar = await this.getById(user, request.scholarId);
    if (!scholar) {
      throw new Error('Scholar record not found');
    }

    const created = await prisma.renewal.create({
      data: {
        scholarId: request.scholarId,
        academicYear: request.academicYear,
        semester: request.semester,
        status: 'pending',
        submissionDate: new Date()
      }
    });

    return toRenewal(created);
  }

  async listRenewals(user: JWTPayload, scholarId: number): Promise<Renewal[]> {
    const scholar = await this.getById(user, scholarId);
    if (!scholar) return [];

    const renewals = await prisma.renewal.findMany({ where: { scholarId }, orderBy: { createdAt: 'desc' } });
    return renewals.map(toRenewal);
  }

  async reviewRenewal(
    user: JWTPayload,
    renewalId: number,
    request: ReviewRenewalRequest
  ): Promise<Renewal | undefined> {
    if (!isPrivileged(user)) {
      throw new Error('Not authorized to review renewals');
    }

    try {
      const updated = await prisma.renewal.update({
        where: { id: renewalId },
        data: {
          status: request.decision as any,
          decision: request.decision,
          notes: request.notes,
          reviewedBy: user.sub,
          reviewedAt: new Date()
        }
      });

      prisma.scholar
        .findUnique({ where: { id: updated.scholarId } })
        .then((scholar) => {
          if (!scholar) return;
          return notificationService.create(
            scholar.userId,
            NotificationType.SYSTEM_NOTIFICATION,
            'Renewal Decision',
            `Your renewal request for ${updated.academicYear ?? ''} ${updated.semester ?? ''} was ${request.decision}.`,
            '/my-application'
          );
        })
        .catch((error) => console.error('[NotificationService] Failed to notify scholar of renewal decision', updated.id, error));

      return toRenewal(updated);
    } catch {
      return undefined;
    }
  }

  // ---------------- Allowances ----------------

  async createAllowance(user: JWTPayload, request: CreateAllowanceRequest): Promise<Allowance> {
    if (!isPrivileged(user)) {
      throw new Error('Not authorized to create allowances');
    }

    const created = await prisma.allowance.create({
      data: {
        scholarId: request.scholarId,
        academicYear: request.academicYear,
        semester: request.semester,
        amount: request.amount,
        paymentDate: request.paymentDate ? new Date(request.paymentDate) : undefined,
        status: 'pending'
      }
    });

    return toAllowance(created);
  }

  async releaseAllowance(user: JWTPayload, id: number): Promise<Allowance | undefined> {
    if (!isPrivileged(user)) {
      throw new Error('Not authorized to release allowances');
    }

    try {
      const updated = await prisma.allowance.update({
        where: { id },
        data: { status: 'released', releaseDate: new Date() }
      });
      return toAllowance(updated);
    } catch {
      return undefined;
    }
  }

  async listAllowances(user: JWTPayload, scholarId: number): Promise<Allowance[]> {
    const scholar = await this.getById(user, scholarId);
    if (!scholar) return [];

    const allowances = await prisma.allowance.findMany({ where: { scholarId }, orderBy: { createdAt: 'desc' } });
    return allowances.map(toAllowance);
  }

  // ---------------- Violations ----------------

  async createViolation(user: JWTPayload, request: CreateViolationRequest): Promise<Violation> {
    if (!isPrivileged(user)) {
      throw new Error('Not authorized to record violations');
    }

    const created = await prisma.violation.create({
      data: {
        scholarId: request.scholarId,
        violationType: request.violationType,
        description: request.description,
        severity: request.severity as any,
        actionTaken: request.actionTaken,
        createdBy: user.sub
      }
    });

    return toViolation(created);
  }

  async listViolations(user: JWTPayload, scholarId: number): Promise<Violation[]> {
    const scholar = await this.getById(user, scholarId);
    if (!scholar) return [];

    const violations = await prisma.violation.findMany({ where: { scholarId }, orderBy: { createdAt: 'desc' } });
    return violations.map(toViolation);
  }
}
