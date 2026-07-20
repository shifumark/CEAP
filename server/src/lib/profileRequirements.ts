import { Applicant } from '../types.js';

// Fixed document-type strings a student must upload (profile-level,
// applicationId: null) before any application can be submitted. Mirrored
// client-side in client/src/constants/profileOptions.ts for the upload UI
// — keep both lists identical since types aren't runtime-shared.
export const REQUIRED_PROFILE_DOCUMENT_TYPES = [
  'Valid ID',
  'Certificate of Indigency',
  'Voters Certificate',
  'Enrolment Form',
  'Grades',
  'Real Property Tax Receipt / Certificate of No Land Holding',
  'Application Form',
  'LBP ATM Card Photocopy'
] as const;

// Year levels considered "college" for the conditional courseName
// requirement — mirrored in client/src/constants/profileOptions.ts.
export const COLLEGE_YEAR_LEVELS = [
  '1st Year College',
  '2nd Year College',
  '3rd Year College',
  '4th Year College',
  '5th Year College'
];

// Mirrored in client/src/constants/profileOptions.ts.
export const PROFESSIONAL_YEAR_LEVELS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];

// Year levels where courseName is conditionally required (College,
// Professional/Post Graduate, Special Course, and Other all collect it,
// just via different input widgets client-side).
const COURSE_REQUIRED_YEAR_LEVELS = [...COLLEGE_YEAR_LEVELS, ...PROFESSIONAL_YEAR_LEVELS, 'Special Course', 'Other'];

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function isFamilyMemberComplete(member: Applicant['father']): boolean {
  return (
    !!member &&
    !isEmpty(member.name) &&
    !isEmpty(member.occupation) &&
    !isEmpty(member.monthlyIncome) &&
    !isEmpty(member.educationalAttainment)
  );
}

interface FieldRule {
  label: string;
  present: (a: Applicant) => boolean;
}

const UNCONDITIONAL_RULES: FieldRule[] = [
  { label: 'Middle Name', present: (a) => !isEmpty(a.middleName) },
  { label: 'Suffix', present: (a) => !isEmpty(a.suffix) },
  { label: 'Sex', present: (a) => !isEmpty(a.sex) },
  { label: 'Civil Status', present: (a) => !isEmpty(a.civilStatus) },
  { label: 'Date of Birth', present: (a) => !isEmpty(a.dateOfBirth) },
  { label: 'Age', present: (a) => !isEmpty(a.age) },
  { label: 'Place of Birth', present: (a) => !isEmpty(a.placeOfBirth) },
  { label: 'Nationality', present: (a) => !isEmpty(a.nationality) },
  { label: 'Type of ID', present: (a) => !isEmpty(a.idType) },
  { label: 'Valid ID Number', present: (a) => !isEmpty(a.idNumber) },
  { label: 'Home Address', present: (a) => !isEmpty(a.address) },
  { label: 'Municipality/City', present: (a) => !isEmpty(a.municipality) },
  { label: 'Barangay', present: (a) => !isEmpty(a.barangay) },
  { label: 'Province', present: (a) => !isEmpty(a.province) },
  { label: 'Phone Number', present: (a) => !isEmpty(a.contactNumber) },
  {
    label: 'Are you an Indigenous Peoples (IP) member?',
    present: (a) => !isEmpty(a.isIndigenousPeople)
  },
  {
    label: 'Socio-economic/Sectoral Classification',
    present: (a) => Array.isArray(a.sectoralClassifications) && a.sectoralClassifications.length > 0
  },
  { label: "Father's Information", present: (a) => isFamilyMemberComplete(a.father) },
  { label: "Mother's Information", present: (a) => isFamilyMemberComplete(a.mother) },
  { label: 'Total Household Monthly Income', present: (a) => !isEmpty(a.householdMonthlyIncome) },
  { label: 'Number of Household Members', present: (a) => !isEmpty(a.numberOfHouseholdMembers) },
  { label: 'Number of Dependents Studying', present: (a) => !isEmpty(a.numberOfDependentsStudying) },
  { label: 'Parental Status', present: (a) => !isEmpty(a.parentalStatus) },
  { label: 'Current School', present: (a) => !isEmpty(a.schoolName) },
  { label: 'School Address', present: (a) => !isEmpty(a.schoolAddress) },
  { label: 'School Type', present: (a) => !isEmpty(a.schoolType) },
  { label: 'Year Level', present: (a) => !isEmpty(a.yearLevel) },
  { label: 'General Weighted Average (GWA)', present: (a) => !isEmpty(a.gwa) },
  { label: 'Previous School', present: (a) => !isEmpty(a.previousSchool) },
  { label: 'Academic Status', present: (a) => !isEmpty(a.academicStatus) },
  {
    label: 'Currently receiving any scholarship/assistance?',
    present: (a) => !isEmpty(a.currentlyReceivingAssistance)
  },
  {
    label: 'Have you applied for other scholarships/financial assistance?',
    present: (a) => !isEmpty(a.appliedOtherScholarship)
  },
  {
    label: 'Academic distinction & extracurricular involvement',
    present: (a) => !isEmpty(a.academicDistinctionExtracurricular)
  },
  { label: 'LBP ATM Account Number', present: (a) => !isEmpty(a.lbpAtmAccountNumber) }
];

const CONDITIONAL_RULES: FieldRule[] = [
  {
    label: 'IP Group/Tribe',
    present: (a) => a.isIndigenousPeople !== true || !isEmpty(a.ipGroupTribe)
  },
  {
    label: 'Course',
    present: (a) => !a.yearLevel || !COURSE_REQUIRED_YEAR_LEVELS.includes(a.yearLevel) || !isEmpty(a.courseName)
  },
  {
    label: 'Current Scholarship/Assistance Program',
    present: (a) => a.currentlyReceivingAssistance !== true || !isEmpty(a.currentAssistanceProgram)
  },
  {
    label: 'Current Scholarship/Assistance Amount',
    present: (a) => a.currentlyReceivingAssistance !== true || !isEmpty(a.currentAssistanceAmount)
  },
  {
    label: 'Other Scholarship Program Applied To',
    present: (a) => a.appliedOtherScholarship !== true || !isEmpty(a.otherScholarshipProgram)
  }
];

export function computeMissingFields(applicant: Applicant): string[] {
  return [...UNCONDITIONAL_RULES, ...CONDITIONAL_RULES]
    .filter((rule) => !rule.present(applicant))
    .map((rule) => rule.label);
}

export function computeMissingDocuments(uploadedDocumentTypes: string[]): string[] {
  const uploaded = new Set(uploadedDocumentTypes);
  return REQUIRED_PROFILE_DOCUMENT_TYPES.filter((docType) => !uploaded.has(docType));
}
