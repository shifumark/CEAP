export const SEX_OPTIONS = ['Male', 'Female'];

export const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Other'];

export const SUFFIX_OPTIONS = ['None', 'Jr.', 'Sr.', 'Other'];

export const ID_TYPE_OPTIONS = ["Driver's License", 'PhilID/National ID', "Voter's ID", 'Others'];

export const SECTORAL_CLASSIFICATIONS = [
  '4Ps Beneficiary (Pantawid Pamilyang Pilipino Program)',
  'Indigenous Peoples (IP)',
  'Person with Disability (PWD)',
  'Solo Parent',
  'Child of Overseas Filipino Worker (OFW)',
  'Child of Farmer/Fisherfolk',
  'Informal Settler',
  'None of the above'
];

export const PARENTAL_STATUS_OPTIONS = [
  'Not applicable (Living with both parents)',
  'Orphan (Both parents are deceased)',
  'Half-orphan (Father deceased)',
  'Half-orphan (Mother deceased)',
  'Single-parenthood',
  'Other'
];

// Grouped together in the Year Level dropdown (Senior High + ALS).
export const SENIOR_HIGH_ALS_YEAR_LEVELS = ['Grade 11', 'Grade 12', 'Alternative Learning System'];

// Must stay in sync with server/src/lib/profileRequirements.ts's
// COLLEGE_YEAR_LEVELS — used to conditionally require Course.
export const COLLEGE_YEAR_LEVELS = [
  '1st Year College',
  '2nd Year College',
  '3rd Year College',
  '4th Year College',
  '5th Year College'
];

// Grouped under the "Special Course" heading in the Year Level dropdown.
// Must stay in sync with server/src/lib/profileRequirements.ts's
// PROFESSIONAL_YEAR_LEVELS — used to conditionally require Course.
export const PROFESSIONAL_YEAR_LEVELS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];

// Shown as a dropdown (plus a free-text "Other") once one of the
// PROFESSIONAL_YEAR_LEVELS above is selected — selection is stored in the
// same courseName field used for College courses.
export const SPECIAL_COURSE_OPTIONS = ['Juris Doctor', 'Doctor of Veterinary Medicine', 'Doctor of Medicine'];

export const YEAR_LEVEL_OPTIONS = [...SENIOR_HIGH_ALS_YEAR_LEVELS, ...COLLEGE_YEAR_LEVELS, ...PROFESSIONAL_YEAR_LEVELS, 'Other'];

export const SCHOOL_TYPE_OPTIONS = ['Private', 'Public'];

export const ACADEMIC_STATUS_OPTIONS = [
  'Good standing (No failing grades)',
  'With failing grades (Below 30% of total subjects)',
  'Incomplete (INC) grade/s',
  'With failed subject/s (30% or more of total subjects)',
  'Dropped subject/s'
];

// Must stay in sync with server/src/lib/profileRequirements.ts's
// REQUIRED_PROFILE_DOCUMENT_TYPES.
export const REQUIRED_PROFILE_DOCUMENT_TYPES = [
  'Valid ID',
  'Certificate of Indigency',
  'Voters Certificate',
  'Enrolment Form',
  'Grades',
  'Real Property Tax Receipt / Certificate of No Land Holding',
  'Application Form',
  'LBP ATM Card Photocopy'
];
