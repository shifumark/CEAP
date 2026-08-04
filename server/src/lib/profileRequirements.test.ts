import { describe, it, expect } from 'vitest';
import { computeMissingFields, computeMissingDocuments, COLLEGE_YEAR_LEVELS, PROFESSIONAL_YEAR_LEVELS } from './profileRequirements.js';
import { Applicant } from '../types.js';

// A fully-filled-out profile satisfying every unconditional rule and
// every conditional rule's "not applicable" branch — the baseline every
// test below mutates a single field away from.
const completeApplicant: Applicant = {
  id: 1,
  userId: 1,
  firstName: 'Anton',
  lastName: 'Culili',
  middleName: 'Jose',
  suffix: 'None',
  sex: 'Male',
  civilStatus: 'Single',
  dateOfBirth: new Date('2003-01-01'),
  age: 23,
  placeOfBirth: 'Conner, Apayao',
  nationality: 'Filipino',
  idType: 'PhilID/National ID',
  idNumber: '1234567890',
  address: 'Talifugu',
  municipality: 'Conner',
  barangay: 'Paddaoan',
  province: 'Apayao',
  contactNumber: '09171234567',
  isIndigenousPeople: false,
  ipGroupTribe: undefined,
  sectoralClassifications: ['4Ps Beneficiary (Pantawid Pamilyang Pilipino Program)'],
  father: { name: 'Father Name', occupation: 'Farmer', monthlyIncome: 5000, educationalAttainment: 'College' },
  mother: { name: 'Mother Name', occupation: 'Housewife', monthlyIncome: 0, educationalAttainment: 'High School' },
  householdMonthlyIncome: 10000,
  numberOfHouseholdMembers: 5,
  numberOfDependentsStudying: 2,
  parentalStatus: 'Both parents living',
  schoolName: 'Conner National High School',
  schoolAddress: 'Malama, Conner, Apayao',
  schoolType: 'Public',
  yearLevel: 'Grade 12',
  courseName: undefined,
  gwa: 90,
  academicStatus: 'Good standing (No failing grades)',
  currentlyReceivingAssistance: false,
  currentAssistanceProgram: undefined,
  currentAssistanceAmount: undefined,
  appliedOtherScholarship: false,
  otherScholarshipProgram: undefined,
  academicDistinctionExtracurricular: 'None',
  lbpAtmAccountNumber: '1234567890123456789',
  profileLocked: false,
  createdAt: new Date(),
  updatedAt: new Date()
} as Applicant;

describe('computeMissingFields — unconditional rules', () => {
  it('returns an empty list for a fully complete profile', () => {
    expect(computeMissingFields(completeApplicant)).toEqual([]);
  });

  it('flags a plain missing field', () => {
    const missing = computeMissingFields({ ...completeApplicant, barangay: undefined });
    expect(missing).toContain('Barangay');
  });

  it('flags an empty sectoral classification array', () => {
    const missing = computeMissingFields({ ...completeApplicant, sectoralClassifications: [] });
    expect(missing).toContain('Socio-economic/Sectoral Classification');
  });

  it("flags incomplete father's information even if only one sub-field is missing", () => {
    const missing = computeMissingFields({
      ...completeApplicant,
      father: { ...completeApplicant.father!, occupation: undefined }
    });
    expect(missing).toContain("Father's Information");
  });
});

describe('computeMissingFields — conditional rules', () => {
  it('requires IP Group/Tribe only when isIndigenousPeople is true', () => {
    expect(computeMissingFields({ ...completeApplicant, isIndigenousPeople: true, ipGroupTribe: undefined })).toContain(
      'IP Group/Tribe'
    );
    expect(computeMissingFields({ ...completeApplicant, isIndigenousPeople: false, ipGroupTribe: undefined })).not.toContain(
      'IP Group/Tribe'
    );
  });

  it('requires Course only for College/Special Course year levels', () => {
    for (const yearLevel of [...COLLEGE_YEAR_LEVELS, ...PROFESSIONAL_YEAR_LEVELS]) {
      expect(computeMissingFields({ ...completeApplicant, yearLevel, courseName: undefined })).toContain('Course');
    }
    // Grade 12 (Senior High) doesn't collect a course at all.
    expect(computeMissingFields({ ...completeApplicant, yearLevel: 'Grade 12', courseName: undefined })).not.toContain(
      'Course'
    );
  });

  it('requires current assistance program/amount only when currentlyReceivingAssistance is true', () => {
    const missingWhenTrue = computeMissingFields({
      ...completeApplicant,
      currentlyReceivingAssistance: true,
      currentAssistanceProgram: undefined,
      currentAssistanceAmount: undefined
    });
    expect(missingWhenTrue).toContain('Current Scholarship/Assistance Program');
    expect(missingWhenTrue).toContain('Current Scholarship/Assistance Amount');

    const missingWhenFalse = computeMissingFields({
      ...completeApplicant,
      currentlyReceivingAssistance: false,
      currentAssistanceProgram: undefined,
      currentAssistanceAmount: undefined
    });
    expect(missingWhenFalse).not.toContain('Current Scholarship/Assistance Program');
    expect(missingWhenFalse).not.toContain('Current Scholarship/Assistance Amount');
  });

  it('requires the other-scholarship-program name only when appliedOtherScholarship is true', () => {
    expect(
      computeMissingFields({ ...completeApplicant, appliedOtherScholarship: true, otherScholarshipProgram: undefined })
    ).toContain('Other Scholarship Program Applied To');
    expect(
      computeMissingFields({ ...completeApplicant, appliedOtherScholarship: false, otherScholarshipProgram: undefined })
    ).not.toContain('Other Scholarship Program Applied To');
  });
});

describe('computeMissingDocuments', () => {
  it('returns required types that were not uploaded', () => {
    const missing = computeMissingDocuments(['Valid ID'], ['Valid ID', 'Birth Certificate', 'Report Card']);
    expect(missing).toEqual(['Birth Certificate', 'Report Card']);
  });

  it('returns an empty list when everything required was uploaded', () => {
    expect(computeMissingDocuments(['Valid ID', 'Birth Certificate'], ['Valid ID', 'Birth Certificate'])).toEqual([]);
  });

  it('ignores extra uploaded document types not in the required list', () => {
    expect(computeMissingDocuments(['Valid ID', 'Extra Doc'], ['Valid ID'])).toEqual([]);
  });
});
