import type { Applicant as PrismaApplicant, FamilyMember as PrismaFamilyMember } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { computeMissingFields, computeMissingDocuments } from '../lib/profileRequirements.js';
import { Applicant, FamilyMemberDetail, ProfileCompleteness, UpdateApplicantProfileRequest, JWTPayload } from '../types.js';

type ApplicantWithFamily = PrismaApplicant & { familyMembers: PrismaFamilyMember[] };

function computeAge(dateOfBirth: Date | null): number {
  if (!dateOfBirth) return 0;
  const diffMs = Date.now() - dateOfBirth.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

function toFamilyMemberDetail(record: PrismaFamilyMember | undefined): FamilyMemberDetail | undefined {
  if (!record) return undefined;
  return {
    name: record.name ?? undefined,
    occupation: record.occupation ?? undefined,
    monthlyIncome: record.monthlyIncome ? record.monthlyIncome.toNumber() : undefined,
    educationalAttainment: record.educationalAttainment ?? undefined
  };
}

function toApplicant(record: ApplicantWithFamily): Applicant {
  const father = record.familyMembers.find((m) => m.memberType === 'father');
  const mother = record.familyMembers.find((m) => m.memberType === 'mother');
  const guardian = record.familyMembers.find((m) => m.memberType === 'guardian');

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

    placeOfBirth: record.placeOfBirth ?? undefined,
    nationality: record.nationality ?? undefined,
    idType: record.idType ?? undefined,
    idNumber: record.idNumber ?? undefined,

    isIndigenousPeople: record.isIndigenousPeople ?? undefined,
    ipGroupTribe: record.ipGroupTribe ?? undefined,

    province: record.province ?? undefined,

    sectoralClassifications: record.sectoralClassifications ?? [],
    sectoralClassificationOther: record.sectoralClassificationOther ?? undefined,

    numberOfHouseholdMembers: record.numberOfHouseholdMembers ?? undefined,
    numberOfDependentsStudying: record.numberOfDependentsStudying ?? undefined,
    parentalStatus: record.parentalStatus ?? undefined,
    father: toFamilyMemberDetail(father),
    mother: toFamilyMemberDetail(mother),
    guardian: toFamilyMemberDetail(guardian),

    schoolAddress: record.schoolAddress ?? undefined,
    schoolType: record.schoolType ?? undefined,
    gwa: record.gwa ? record.gwa.toNumber() : undefined,
    previousSchool: record.previousSchool ?? undefined,
    honorsAwards: record.honorsAwards ?? undefined,
    academicStatus: record.academicStatus ?? undefined,

    currentlyReceivingAssistance: record.currentlyReceivingAssistance ?? undefined,
    currentAssistanceProgram: record.currentAssistanceProgram ?? undefined,
    currentAssistanceAmount: record.currentAssistanceAmount ? record.currentAssistanceAmount.toNumber() : undefined,
    appliedOtherScholarship: record.appliedOtherScholarship ?? undefined,
    otherScholarshipProgram: record.otherScholarshipProgram ?? undefined,
    academicDistinctionExtracurricular: record.academicDistinctionExtracurricular ?? undefined,

    lbpAtmAccountNumber: record.lbpAtmAccountNumber ?? undefined,

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
    const existing = await prisma.applicant.findUnique({ where: { userId }, include: { familyMembers: true } });
    if (existing) return toApplicant(existing);

    const created = await prisma.applicant.create({ data: { userId }, include: { familyMembers: true } });
    return toApplicant(created);
  }

  async getProfile(userId: number): Promise<Applicant | undefined> {
    const record = await prisma.applicant.findUnique({ where: { userId }, include: { familyMembers: true } });
    return record ? toApplicant(record) : undefined;
  }

  /**
   * Admin-only lookup by Applicant.id (not userId) — used when reviewing
   * an application, where only the applicantId is known. Callers must
   * enforce the admin-role check themselves (see routes.ts); this method
   * has no ownership predicate of its own.
   */
  async getProfileByApplicantId(applicantId: number): Promise<Applicant | undefined> {
    const record = await prisma.applicant.findUnique({ where: { id: applicantId }, include: { familyMembers: true } });
    return record ? toApplicant(record) : undefined;
  }

  async updateProfile(userId: number, request: UpdateApplicantProfileRequest): Promise<Applicant> {
    // Ensure a row exists first (applicant profiles are created lazily).
    const applicant = await this.getOrCreateForUser(userId);
    const { father, mother, guardian, ...flatFields } = request;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.applicant.update({
        where: { userId },
        data: {
          ...flatFields,
          dateOfBirth: flatFields.dateOfBirth ? new Date(flatFields.dateOfBirth) : undefined
        }
      });

      const upsertMember = (memberType: 'father' | 'mother' | 'guardian', detail?: FamilyMemberDetail) => {
        if (!detail) return Promise.resolve();
        return tx.familyMember.upsert({
          where: { applicantId_memberType: { applicantId: applicant.id, memberType } },
          update: {
            name: detail.name,
            occupation: detail.occupation,
            monthlyIncome: detail.monthlyIncome,
            educationalAttainment: detail.educationalAttainment
          },
          create: {
            applicantId: applicant.id,
            memberType,
            name: detail.name ?? '',
            occupation: detail.occupation,
            monthlyIncome: detail.monthlyIncome,
            educationalAttainment: detail.educationalAttainment
          }
        });
      };

      await Promise.all([upsertMember('father', father), upsertMember('mother', mother), upsertMember('guardian', guardian)]);

      return tx.applicant.findUniqueOrThrow({ where: { userId }, include: { familyMembers: true } });
    });

    return toApplicant(updated);
  }

  async getProfileCompleteness(user: JWTPayload): Promise<ProfileCompleteness> {
    const applicant = await this.getOrCreateForUser(user.sub);
    const documents = await prisma.uploadedDocument.findMany({
      where: { userId: user.sub, applicationId: null },
      select: { documentType: true }
    });
    const uploadedTypes = documents.map((d) => d.documentType).filter((t): t is string => !!t);

    const missingFields = computeMissingFields(applicant);
    const missingDocuments = computeMissingDocuments(uploadedTypes);

    return {
      complete: missingFields.length === 0 && missingDocuments.length === 0,
      missingFields,
      missingDocuments
    };
  }
}
