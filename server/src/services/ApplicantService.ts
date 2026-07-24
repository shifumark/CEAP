import { Prisma } from '@prisma/client';
import type { Applicant as PrismaApplicant, FamilyMember as PrismaFamilyMember, User as PrismaUser } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { computeMissingFields, computeMissingDocuments } from '../lib/profileRequirements.js';
import { Applicant, FamilyMemberDetail, ProfileCompleteness, UpdateApplicantProfileRequest, JWTPayload } from '../types.js';
import { DocumentRequirementService } from './DocumentRequirementService.js';

const documentRequirementService = new DocumentRequirementService();

const applicantInclude = { familyMembers: true, user: true } satisfies Prisma.ApplicantInclude;
type ApplicantWithFamily = PrismaApplicant & { familyMembers: PrismaFamilyMember[]; user: PrismaUser };

function computeAge(dateOfBirth: Date | null): number | undefined {
  if (!dateOfBirth) return undefined;
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
    firstName: record.user.firstName,
    lastName: record.user.lastName,
    middleName: record.middleName ?? undefined,
    suffix: record.suffix ?? undefined,
    dateOfBirth: record.dateOfBirth ?? undefined,
    age: record.age ?? computeAge(record.dateOfBirth),
    sex: record.sex ?? '',
    civilStatus: record.civilStatus ?? '',
    contactNumber: record.contactNumber ?? '',
    contactEmail: record.contactEmail ?? '',
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
    const existing = await prisma.applicant.findUnique({ where: { userId }, include: applicantInclude });
    if (existing) return toApplicant(existing);

    const created = await prisma.applicant.create({ data: { userId }, include: applicantInclude });
    return toApplicant(created);
  }

  async getProfile(userId: number): Promise<Applicant | undefined> {
    const record = await prisma.applicant.findUnique({ where: { userId }, include: applicantInclude });
    return record ? toApplicant(record) : undefined;
  }

  /**
   * Admin-only lookup by Applicant.id (not userId) — used when reviewing
   * an application, where only the applicantId is known. Callers must
   * enforce the admin-role check themselves (see routes.ts); this method
   * has no ownership predicate of its own.
   */
  async getProfileByApplicantId(applicantId: number): Promise<Applicant | undefined> {
    const record = await prisma.applicant.findUnique({ where: { id: applicantId }, include: applicantInclude });
    return record ? toApplicant(record) : undefined;
  }

  async updateProfile(userId: number, request: UpdateApplicantProfileRequest): Promise<Applicant> {
    // Ensure a row exists first (applicant profiles are created lazily).
    const applicant = await this.getOrCreateForUser(userId);
    const { father, mother, guardian, firstName, lastName } = request;

    // Built field-by-field from an explicit whitelist rather than
    // spreading `request` — req.body is untyped at runtime, so a raw
    // request could otherwise smuggle in columns like `userId` or `id`
    // (Applicant.userId is unique, so setting it to another user's id
    // would silently reassign this profile to their account).
    const data: Prisma.ApplicantUpdateInput = {
      middleName: request.middleName,
      suffix: request.suffix,
      dateOfBirth: request.dateOfBirth ? new Date(request.dateOfBirth) : undefined,
      age: request.age,
      sex: request.sex,
      civilStatus: request.civilStatus,
      contactNumber: request.contactNumber,
      contactEmail: request.contactEmail,
      address: request.address,
      schoolName: request.schoolName,
      courseName: request.courseName,
      yearLevel: request.yearLevel,
      municipality: request.municipality,
      barangay: request.barangay,
      zipCode: request.zipCode,
      householdMonthlyIncome: request.householdMonthlyIncome,
      placeOfBirth: request.placeOfBirth,
      nationality: request.nationality,
      idType: request.idType,
      idNumber: request.idNumber,
      isIndigenousPeople: request.isIndigenousPeople,
      ipGroupTribe: request.ipGroupTribe,
      province: request.province,
      sectoralClassifications: request.sectoralClassifications,
      sectoralClassificationOther: request.sectoralClassificationOther,
      numberOfHouseholdMembers: request.numberOfHouseholdMembers,
      numberOfDependentsStudying: request.numberOfDependentsStudying,
      parentalStatus: request.parentalStatus,
      schoolAddress: request.schoolAddress,
      schoolType: request.schoolType,
      gwa: request.gwa,
      previousSchool: request.previousSchool,
      honorsAwards: request.honorsAwards,
      academicStatus: request.academicStatus,
      currentlyReceivingAssistance: request.currentlyReceivingAssistance,
      currentAssistanceProgram: request.currentAssistanceProgram,
      currentAssistanceAmount: request.currentAssistanceAmount,
      appliedOtherScholarship: request.appliedOtherScholarship,
      otherScholarshipProgram: request.otherScholarshipProgram,
      academicDistinctionExtracurricular: request.academicDistinctionExtracurricular,
      lbpAtmAccountNumber: request.lbpAtmAccountNumber
    };

    const updated = await prisma.$transaction(async (tx) => {
      if (firstName !== undefined || lastName !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { firstName, lastName } });
      }

      await tx.applicant.update({ where: { userId }, data });

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

      return tx.applicant.findUniqueOrThrow({ where: { userId }, include: applicantInclude });
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
    const requiredDocuments = await documentRequirementService.list();
    const requiredTypes = requiredDocuments.map((d) => d.documentType);

    const missingFields = computeMissingFields(applicant);
    const missingDocuments = computeMissingDocuments(uploadedTypes, requiredTypes);

    return {
      complete: missingFields.length === 0 && missingDocuments.length === 0,
      missingFields,
      missingDocuments
    };
  }
}
