import type { Applicant as PrismaApplicant } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { Applicant, UpdateApplicantProfileRequest } from '../types.js';

function computeAge(dateOfBirth: Date | null): number {
  if (!dateOfBirth) return 0;
  const diffMs = Date.now() - dateOfBirth.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

function toApplicant(record: PrismaApplicant): Applicant {
  return {
    id: record.id,
    userId: record.userId,
    middleName: record.middleName ?? undefined,
    suffix: record.suffix ?? undefined,
    dateOfBirth: record.dateOfBirth ?? undefined,
    age: computeAge(record.dateOfBirth),
    sex: record.sex ?? '',
    civilStatus: record.civilStatus ?? '',
    contactNumber: record.contactNumber ?? '',
    address: record.address ?? '',
    schoolName: record.schoolName ?? undefined,
    courseName: record.courseName ?? undefined,
    yearLevel: record.yearLevel ?? undefined,
    municipality: record.municipality ?? '',
    barangay: record.barangay ?? '',
    zipCode: record.zipCode ?? '',
    householdMonthlyIncome: record.householdMonthlyIncome ? record.householdMonthlyIncome.toNumber() : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

/**
 * Owns the users -> applicants join. An Applicant profile is created lazily
 * the first time a user needs one (first application, first document
 * upload) rather than at registration time.
 */
export class ApplicantService {
  async getOrCreateForUser(userId: number): Promise<Applicant> {
    const existing = await prisma.applicant.findUnique({ where: { userId } });
    if (existing) return toApplicant(existing);

    const created = await prisma.applicant.create({ data: { userId } });
    return toApplicant(created);
  }

  async getProfile(userId: number): Promise<Applicant | undefined> {
    const record = await prisma.applicant.findUnique({ where: { userId } });
    return record ? toApplicant(record) : undefined;
  }

  async updateProfile(userId: number, request: UpdateApplicantProfileRequest): Promise<Applicant> {
    // Ensure a row exists first (applicant profiles are created lazily),
    // then update it — upsert would work too, but this keeps the
    // "create" path centralized in getOrCreateForUser.
    await this.getOrCreateForUser(userId);

    const updated = await prisma.applicant.update({
      where: { userId },
      data: {
        schoolName: request.schoolName,
        yearLevel: request.yearLevel,
        courseName: request.courseName,
        address: request.address
      }
    });

    return toApplicant(updated);
  }
}
