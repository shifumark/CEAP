import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  Application,
  ApplicationStatusHistory,
  ApplicationStatus,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationFilters,
  ApplicationReportRow,
  ApplicationReportFilters,
  PaginatedResponse,
  JWTPayload,
  UserRole,
  NotificationType
} from '../types.js';
import { ApplicantService } from './ApplicantService.js';
import { ScholarService } from './ScholarService.js';
import { NotificationService } from './NotificationService.js';
import { EmailService } from './EmailService.js';
import { supabaseAdmin, DOCUMENTS_BUCKET } from '../lib/supabase.js';
import { drive } from '../lib/googleDrive.js';

const applicantService = new ApplicantService();
const scholarService = new ScholarService();
const notificationService = new NotificationService();
const emailService = new EmailService();

const FINALIZED_STATUSES = ['approved', 'rejected'];

const applicationInclude = {
  scholarship: true,
  applicant: { include: { user: true } }
} satisfies Prisma.ApplicationInclude;

type ApplicationWithRelations = Prisma.ApplicationGetPayload<{ include: typeof applicationInclude }>;

function toApplication(record: ApplicationWithRelations): Application {
  return {
    id: record.id,
    applicantId: record.applicantId,
    scholarshipId: record.scholarshipId,
    status: record.status as unknown as ApplicationStatus,
    submissionDate: record.submissionDate ?? undefined,
    receivedDate: record.receivedDate ?? undefined,
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: record.reviewedAt ?? undefined,
    comments: record.comments ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    scholarshipName: record.scholarship?.name,
    applicantName: record.applicant?.user
      ? `${record.applicant.user.firstName} ${record.applicant.user.lastName}`
      : undefined,
    applicantEmail: record.applicant?.user?.email,
    applicantBarangay: record.applicant?.barangay ?? undefined,
    // Fallback for applicants whose location was entered as free text under
    // the legacy `address` field instead of the structured barangay field —
    // the Barangay search matches against this too, so those records are
    // still findable.
    applicantAddress: record.applicant?.address ?? undefined
  };
}

function toHistory(record: Prisma.ApplicationStatusHistoryGetPayload<{}>): ApplicationStatusHistory {
  return {
    id: record.id,
    applicationId: record.applicationId,
    previousStatus: (record.previousStatus as unknown as ApplicationStatus) ?? undefined,
    newStatus: record.newStatus as unknown as ApplicationStatus,
    changedBy: record.changedBy ?? 0,
    notes: record.notes ?? undefined,
    createdAt: record.createdAt
  };
}

function isPrivileged(user: JWTPayload): boolean {
  return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
}

export class ApplicationService {
  async createApplication(user: JWTPayload, request: CreateApplicationRequest): Promise<Application> {
    const applicant = await applicantService.getOrCreateForUser(user.sub);

    const scholarship = await prisma.scholarshipProgram.findUnique({ where: { id: request.scholarshipId } });
    if (!scholarship) {
      throw new Error('Scholarship not found');
    }
    if (scholarship.status !== 'active') {
      throw new Error('This scholarship is not currently accepting applications');
    }

    const existing = await prisma.application.findFirst({
      where: { applicantId: applicant.id, scholarshipId: request.scholarshipId }
    });
    if (existing) {
      throw new Error('You have already applied to this scholarship');
    }

    const created = await prisma.application.create({
      data: {
        applicantId: applicant.id,
        scholarshipId: request.scholarshipId,
        status: 'draft'
      },
      include: applicationInclude
    });

    return toApplication(created);
  }

  async submitApplication(user: JWTPayload, applicationId: number): Promise<Application> {
    const application = await this.getOwnedRecord(user, applicationId);
    if (!application) {
      throw new Error('Application not found');
    }
    if (application.status !== 'draft' && application.status !== 'needs_revision') {
      throw new Error('Only draft or needs-revision applications can be submitted');
    }

    const completeness = await applicantService.getProfileCompleteness(user);
    if (!completeness.complete) {
      throw new Error(
        `Your profile is incomplete. Missing: ${[...completeness.missingFields, ...completeness.missingDocuments].join(', ')}`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: application.id },
        data: { status: 'submitted', submissionDate: new Date() },
        include: applicationInclude
      });
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: app.id,
          previousStatus: application.status,
          newStatus: 'submitted',
          changedBy: user.sub
        }
      });
      return app;
    });

    const applicantName = updated.applicant?.user
      ? `${updated.applicant.user.firstName} ${updated.applicant.user.lastName}`
      : 'An applicant';
    notificationService
      .notifyAdminsOfNewApplication(applicantName, updated.scholarship?.name ?? 'a scholarship')
      .catch((error) => console.error('[NotificationService] Failed to notify admins of new application', updated.id, error));

    return toApplication(updated);
  }

  async listApplications(user: JWTPayload, filters?: ApplicationFilters): Promise<PaginatedResponse<Application>> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;

    const where: Prisma.ApplicationWhereInput = {};
    if (filters?.status) where.status = filters.status as any;
    if (filters?.scholarshipId) where.scholarshipId = filters.scholarshipId;

    if (!isPrivileged(user)) {
      // Ownership predicate baked directly into the query — a Student can
      // never receive rows belonging to another applicant, regardless of
      // what filters were requested.
      const applicant = await applicantService.getOrCreateForUser(user.sub);
      where.applicantId = applicant.id;
    } else {
      if (filters?.applicantId) where.applicantId = filters.applicantId;
      // Admins never see draft applications — a draft hasn't been
      // submitted yet and is still the student's own in-progress work.
      // This overrides even an explicit status=draft filter request.
      where.status = filters?.status && (filters.status as unknown as string) !== 'draft' ? (filters.status as any) : { not: 'draft' };
    }

    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: applicationInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' }
      }),
      prisma.application.count({ where })
    ]);

    return {
      data: items.map(toApplication),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Flattened applicant profile + application rows for the admin Reports
   * page. Callers must already be admin-gated (route-level requireAdmin) —
   * unlike listApplications, this has no self-scoping fallback since it's
   * never called on behalf of a Student. Properly paginated (not a
   * hardcoded row cap) so a filter matching more rows than one page
   * doesn't silently truncate — the client fetches every page in
   * sequence when it needs the complete filtered set (e.g. for CSV
   * export).
   */
  async getReport(filters: ApplicationReportFilters): Promise<PaginatedResponse<ApplicationReportRow>> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 1000) : 200;

    // Application is the base table here, so a deleted Application is
    // already excluded by construction, and deleting an Applicant
    // cascades to delete its Applications too (schema.prisma) — neither
    // can produce a ghost row. A soft-deleted User (deletedAt set) is the
    // one case that wouldn't be caught by either of those: the
    // Application and Applicant rows survive untouched, so without this
    // filter their stale name/email would still show up in the report.
    const where: Prisma.ApplicationWhereInput = {
      applicant: { user: { deletedAt: null } }
    };
    if (filters.status) where.status = filters.status as any;
    if (filters.barangay) {
      where.applicant = {
        ...(where.applicant as Prisma.ApplicantWhereInput),
        barangay: { contains: filters.barangay, mode: 'insensitive' }
      };
    }
    if (filters.name) {
      const existingApplicant = where.applicant as Prisma.ApplicantWhereInput;
      where.applicant = {
        ...existingApplicant,
        user: {
          ...(existingApplicant.user as Prisma.UserWhereInput),
          OR: [
            { firstName: { contains: filters.name, mode: 'insensitive' } },
            { lastName: { contains: filters.name, mode: 'insensitive' } }
          ]
        }
      };
    }

    const [rows, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          scholarship: true,
          applicant: { include: { user: true, familyMembers: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.application.count({ where })
    ]);

    // Scholar has no direct applicationId FK (and is keyed uniquely per
    // userId, not per program — see ScholarService), so the Scholar ID
    // for each report row is looked up separately, in one bulk query
    // rather than N+1. Only applications whose applicant has actually
    // become a Scholar (i.e. was approved at some point) will have one.
    const userIds = rows.map((r) => r.applicant.user.id);
    const scholars = userIds.length
      ? await prisma.scholar.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, scholarIdNumber: true }
        })
      : [];
    const scholarIdByUserId = new Map(scholars.map((s) => [s.userId, s.scholarIdNumber ?? undefined]));

    const data = rows.map((r) => {
      const father = r.applicant.familyMembers.find((m) => m.memberType === 'father');
      const mother = r.applicant.familyMembers.find((m) => m.memberType === 'mother');
      const guardian = r.applicant.familyMembers.find((m) => m.memberType === 'guardian');

      return {
        applicationId: r.id,
        applicantId: r.applicantId,
        lastName: r.applicant.user.lastName,
        firstName: r.applicant.user.firstName,
        middleName: r.applicant.middleName ?? undefined,
        suffix: r.applicant.suffix ?? undefined,
        sex: r.applicant.sex ?? undefined,
        civilStatus: r.applicant.civilStatus ?? undefined,
        dateOfBirth: r.applicant.dateOfBirth ?? undefined,
        age: r.applicant.age ?? undefined,
        placeOfBirth: r.applicant.placeOfBirth ?? undefined,
        nationality: r.applicant.nationality ?? undefined,
        idType: r.applicant.idType ?? undefined,
        idNumber: r.applicant.idNumber ?? undefined,
        isIndigenousPeople: r.applicant.isIndigenousPeople ?? undefined,
        ipGroupTribe: r.applicant.ipGroupTribe ?? undefined,
        address: r.applicant.address ?? undefined,
        barangay: r.applicant.barangay ?? undefined,
        municipality: r.applicant.municipality ?? undefined,
        province: r.applicant.province ?? undefined,
        contactNumber: r.applicant.contactNumber ?? undefined,
        // The applicant's chosen notification address takes priority in
        // reports too, falling back to their account login email.
        email: r.applicant.contactEmail || r.applicant.user.email,
        sectoralClassifications: r.applicant.sectoralClassifications,
        sectoralClassificationOther: r.applicant.sectoralClassificationOther ?? undefined,
        numberOfHouseholdMembers: r.applicant.numberOfHouseholdMembers ?? undefined,
        numberOfDependentsStudying: r.applicant.numberOfDependentsStudying ?? undefined,
        parentalStatus: r.applicant.parentalStatus ?? undefined,
        fatherName: father?.name,
        fatherOccupation: father?.occupation ?? undefined,
        fatherMonthlyIncome: father?.monthlyIncome ? Number(father.monthlyIncome) : undefined,
        fatherEducationalAttainment: father?.educationalAttainment ?? undefined,
        motherName: mother?.name,
        motherOccupation: mother?.occupation ?? undefined,
        motherMonthlyIncome: mother?.monthlyIncome ? Number(mother.monthlyIncome) : undefined,
        motherEducationalAttainment: mother?.educationalAttainment ?? undefined,
        guardianName: guardian?.name,
        guardianOccupation: guardian?.occupation ?? undefined,
        guardianMonthlyIncome: guardian?.monthlyIncome ? Number(guardian.monthlyIncome) : undefined,
        guardianEducationalAttainment: guardian?.educationalAttainment ?? undefined,
        householdMonthlyIncome: r.applicant.householdMonthlyIncome ? Number(r.applicant.householdMonthlyIncome) : undefined,
        schoolName: r.applicant.schoolName ?? undefined,
        schoolAddress: r.applicant.schoolAddress ?? undefined,
        schoolType: r.applicant.schoolType ?? undefined,
        courseName: r.applicant.courseName ?? undefined,
        yearLevel: r.applicant.yearLevel ?? undefined,
        gwa: r.applicant.gwa ? Number(r.applicant.gwa) : undefined,
        honorsAwards: r.applicant.honorsAwards ?? undefined,
        academicStatus: r.applicant.academicStatus ?? undefined,
        currentlyReceivingAssistance: r.applicant.currentlyReceivingAssistance ?? undefined,
        currentAssistanceProgram: r.applicant.currentAssistanceProgram ?? undefined,
        currentAssistanceAmount: r.applicant.currentAssistanceAmount ? Number(r.applicant.currentAssistanceAmount) : undefined,
        appliedOtherScholarship: r.applicant.appliedOtherScholarship ?? undefined,
        otherScholarshipProgram: r.applicant.otherScholarshipProgram ?? undefined,
        academicDistinctionExtracurricular: r.applicant.academicDistinctionExtracurricular ?? undefined,
        lbpAtmAccountNumber: r.applicant.lbpAtmAccountNumber ?? undefined,
        scholarshipName: r.scholarship?.name,
        status: r.status as unknown as ApplicationStatus,
        scholarIdNumber: scholarIdByUserId.get(r.applicant.user.id),
        submissionDate: r.submissionDate ?? undefined,
        createdAt: r.createdAt
      };
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async getById(user: JWTPayload, id: number): Promise<Application | undefined> {
    const record = await this.getOwnedRecord(user, id);
    return record ? toApplication(record) : undefined;
  }

  async getHistory(user: JWTPayload, id: number): Promise<ApplicationStatusHistory[]> {
    // Confirms ownership (or admin privilege) before returning any history.
    const application = await this.getOwnedRecord(user, id);
    if (!application) return [];

    const history = await prisma.applicationStatusHistory.findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: 'asc' }
    });
    return history.map(toHistory);
  }

  async updateStatus(
    user: JWTPayload,
    id: number,
    request: UpdateApplicationRequest
  ): Promise<Application | undefined> {
    if (!isPrivileged(user)) {
      throw new Error('Not authorized to update application status');
    }

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) return undefined;

    if (application.status === 'draft') {
      throw new Error('This application is still a draft — the student must submit it before it can be reviewed.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id },
        data: {
          status: (request.status as any) ?? application.status,
          comments: request.comments ?? application.comments,
          reviewedBy: user.sub,
          reviewedAt: new Date(),
          // Refreshed every time an admin moves the application into
          // "under_review" — including after a needs_revision resubmit
          // loop — so it always reflects the most recent pickup.
          ...(request.status === 'under_review' ? { receivedDate: new Date() } : {})
        },
        include: applicationInclude
      });

      if (request.status && request.status !== (application.status as unknown as ApplicationStatus)) {
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: id,
            previousStatus: application.status,
            newStatus: request.status as any,
            changedBy: user.sub,
            notes: request.comments
          }
        });
      }

      return app;
    });

    if (request.status === 'approved' && application.status !== 'approved') {
      // Best-effort: the application decision has already been recorded
      // above, so a failure here shouldn't fail the whole request — it
      // just means Scholar creation needs a manual retry.
      try {
        await scholarService.createFromApprovedApplication(updated.applicant.userId, updated.scholarshipId);
      } catch (error) {
        console.error('[ScholarService] Failed to create scholar for approved application', updated.id, error);
      }
    }

    if (request.status && request.status !== (application.status as unknown as ApplicationStatus)) {
      const notificationType =
        request.status === 'approved'
          ? NotificationType.APPLICATION_APPROVED
          : request.status === 'rejected'
            ? NotificationType.APPLICATION_REJECTED
            : NotificationType.SYSTEM_NOTIFICATION;

      notificationService
        .create(
          updated.applicant.userId,
          notificationType,
          'Application Update',
          `Your application for ${updated.scholarship?.name ?? 'a scholarship'} is now ${request.status.replace(/_/g, ' ')}.`,
          '/my-application'
        )
        .catch((error) => console.error('[NotificationService] Failed to notify applicant', updated.id, error));

      emailService
        .sendApplicationStatusUpdate(
          updated.applicant.contactEmail || updated.applicant.user.email,
          updated.scholarship?.name ?? 'a scholarship',
          request.status
        )
        .catch((error) => console.error('[EmailService] Failed to email applicant', updated.id, error));
    }

    return toApplication(updated);
  }

  /**
   * Lets a Student withdraw their own application — blocked once a final
   * decision (approved/rejected) has been recorded, so the audit trail
   * for a completed review is never destroyed. Cleans up any uploaded
   * files (Drive or, for older rows, Supabase Storage) first so nothing
   * is orphaned; the DB rows (documents, status history) cascade from
   * the Application delete itself.
   */
  async deleteApplication(user: JWTPayload, id: number): Promise<boolean> {
    const application = await this.getOwnedRecord(user, id);
    if (!application) return false;

    if (FINALIZED_STATUSES.includes(application.status)) {
      throw new Error('This application has already been decided and can no longer be deleted');
    }

    const documents = await prisma.uploadedDocument.findMany({
      where: { applicationId: id },
      select: { filePath: true, googleDriveId: true }
    });

    const driveIds = documents.filter((d) => d.googleDriveId).map((d) => d.googleDriveId as string);
    const legacyPaths = documents.filter((d) => !d.googleDriveId).map((d) => d.filePath);

    await Promise.all(driveIds.map((fileId) => drive.files.delete({ fileId }).catch(() => undefined)));

    if (legacyPaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove(legacyPaths);
      if (storageError) {
        throw new Error(`Failed to delete uploaded files: ${storageError.message}`);
      }
    }

    await prisma.application.delete({ where: { id } });
    return true;
  }

  /**
   * Row-level ownership check: Students only ever get rows tied to their
   * own applicantId — a mismatched id resolves to `null` (404), never a
   * leaky 403. Admin/Super Admin bypass the predicate entirely.
   */
  private async getOwnedRecord(user: JWTPayload, id: number): Promise<ApplicationWithRelations | null> {
    if (isPrivileged(user)) {
      return prisma.application.findUnique({ where: { id }, include: applicationInclude });
    }

    const applicant = await applicantService.getOrCreateForUser(user.sub);
    return prisma.application.findFirst({
      where: { id, applicantId: applicant.id },
      include: applicationInclude
    });
  }
}
