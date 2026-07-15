/**
 * Shared TypeScript types for Scholarship Management System
 * Used across client and server
 */

// ENUMS
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  APPLICANT = 'applicant',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated'
}

export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  DOCUMENT_VERIFICATION = 'document_verification',
  INTERVIEW = 'interview',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision'
}

export enum DocumentVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  REQUESTING_REVISION = 'requesting_revision'
}

export enum ScholarStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  GRADUATED = 'graduated',
  TERMINATED = 'terminated'
}

export enum RenewalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  UNDER_REVIEW = 'under_review'
}

export enum AllowanceStatus {
  PENDING = 'pending',
  RELEASED = 'released',
  CANCELLED = 'cancelled'
}

export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AnnouncementType {
  NEWS = 'news',
  DEADLINE = 'deadline',
  EVENT = 'event',
  SCHOLARSHIP_UPDATE = 'scholarship_update',
  MAINTENANCE = 'maintenance'
}

export enum NotificationType {
  APPLICATION_SUBMITTED = 'application_submitted',
  DOCUMENTS_MISSING = 'documents_missing',
  APPLICATION_APPROVED = 'application_approved',
  APPLICATION_REJECTED = 'application_rejected',
  RENEWAL_DUE = 'renewal_due',
  ANNOUNCEMENT_POSTED = 'announcement_posted',
  SYSTEM_NOTIFICATION = 'system_notification'
}

// USER
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  profilePictureUrl?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  status?: UserStatus;
}

// AUTHENTICATION
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface JWTPayload {
  sub: number;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// APPLICANT
export interface FamilyMemberDetail {
  name?: string;
  occupation?: string;
  monthlyIncome?: number;
  educationalAttainment?: string;
}

export interface Applicant {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  dateOfBirth?: Date;
  age: number;
  sex?: string;
  civilStatus?: string;
  contactNumber?: string;
  address?: string;
  schoolName?: string;
  courseName?: string;
  yearLevel?: string;
  municipality?: string;
  barangay?: string;
  zipCode?: string;
  householdMonthlyIncome?: number;

  // I. Personal Information
  placeOfBirth?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;

  // II. IP Affiliation
  isIndigenousPeople?: boolean;
  ipGroupTribe?: string;

  // III. Contact Details
  province?: string;

  // IV. Socio-economic classification
  sectoralClassifications: string[];
  sectoralClassificationOther?: string;

  // V. Family background
  numberOfHouseholdMembers?: number;
  numberOfDependentsStudying?: number;
  parentalStatus?: string;
  father?: FamilyMemberDetail;
  mother?: FamilyMemberDetail;
  guardian?: FamilyMemberDetail;

  // VI. Educational background
  schoolAddress?: string;
  schoolType?: string;
  gwa?: number;
  previousSchool?: string;
  honorsAwards?: string;
  academicStatus?: string;

  // VII. Other educational assistance
  currentlyReceivingAssistance?: boolean;
  currentAssistanceProgram?: string;
  currentAssistanceAmount?: number;
  appliedOtherScholarship?: boolean;
  otherScholarshipProgram?: string;
  academicDistinctionExtracurricular?: string;

  // IX. ATM
  lbpAtmAccountNumber?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApplicantRequest {
  middleName?: string;
  suffix?: string;
  dateOfBirth: string;
  sex: string;
  civilStatus: string;
  contactNumber: string;
  address: string;
  municipality: string;
  barangay: string;
  zipCode: string;
  householdMonthlyIncome?: number;
}

// Full profile update — every field optional so students can save the
// form incrementally across sessions. Required-ness is enforced only at
// application-submit time.
export interface UpdateApplicantProfileRequest {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  suffix?: string;
  dateOfBirth?: string;
  sex?: string;
  civilStatus?: string;
  contactNumber?: string;
  address?: string;
  schoolName?: string;
  courseName?: string;
  yearLevel?: string;
  municipality?: string;
  barangay?: string;
  zipCode?: string;
  householdMonthlyIncome?: number;
  placeOfBirth?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  isIndigenousPeople?: boolean;
  ipGroupTribe?: string;
  province?: string;
  sectoralClassifications?: string[];
  sectoralClassificationOther?: string;
  numberOfHouseholdMembers?: number;
  numberOfDependentsStudying?: number;
  parentalStatus?: string;
  schoolAddress?: string;
  schoolType?: string;
  gwa?: number;
  previousSchool?: string;
  honorsAwards?: string;
  academicStatus?: string;
  currentlyReceivingAssistance?: boolean;
  currentAssistanceProgram?: string;
  currentAssistanceAmount?: number;
  appliedOtherScholarship?: boolean;
  otherScholarshipProgram?: string;
  academicDistinctionExtracurricular?: string;
  lbpAtmAccountNumber?: string;
  father?: FamilyMemberDetail;
  mother?: FamilyMemberDetail;
  guardian?: FamilyMemberDetail;
}

export interface ProfileCompleteness {
  complete: boolean;
  missingFields: string[];
  missingDocuments: string[];
}

// EDUCATIONAL RECORD
export interface EducationalRecord {
  id: number;
  applicantId: number;
  schoolId?: number;
  studentId: string;
  courseId?: number;
  yearLevel: string;
  semester: string;
  gpa: number;
  enrollmentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEducationalRecordRequest {
  schoolId?: number;
  studentId: string;
  courseId?: number;
  yearLevel: string;
  semester: string;
  gpa: number;
  enrollmentStatus: string;
}

// FAMILY MEMBER
export interface FamilyMember {
  id: number;
  applicantId: number;
  name: string;
  relationship: string;
  occupation?: string;
  contactNumber?: string;
  memberType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFamilyMemberRequest {
  name: string;
  relationship: string;
  occupation?: string;
  contactNumber?: string;
  memberType: string;
}

// EMERGENCY CONTACT
export interface EmergencyContact {
  id: number;
  applicantId: number;
  name: string;
  relationship: string;
  contactNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmergencyContactRequest {
  name: string;
  relationship: string;
  contactNumber: string;
}

// SCHOLARSHIP PROGRAM
export interface ScholarshipProgram {
  id: number;
  name: string;
  description: string;
  sponsor: string;
  benefits: string;
  numberOfSlots: number;
  maxApplicants: number;
  eligibilityRequirements: string;
  openingDate: Date;
  closingDate: Date;
  academicYear: string;
  status: string;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScholarshipProgramRequest {
  name: string;
  description: string;
  sponsor: string;
  benefits: string;
  numberOfSlots: number;
  maxApplicants: number;
  eligibilityRequirements: string;
  openingDate: string;
  closingDate: string;
  academicYear: string;
  requiredDocuments?: string[];
}

export interface UpdateScholarshipProgramRequest {
  name?: string;
  description?: string;
  status?: string;
  numberOfSlots?: number;
  maxApplicants?: number;
}

// REQUIRED DOCUMENT
export interface RequiredDocument {
  id: number;
  scholarshipId: number;
  documentType: string;
  description: string;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// APPLICATION
export interface Application {
  id: number;
  applicantId: number;
  scholarshipId: number;
  status: ApplicationStatus;
  submissionDate?: Date;
  reviewedBy?: number;
  reviewedAt?: Date;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
  scholarshipName?: string;
  applicantName?: string;
  applicantEmail?: string;
}

export interface CreateApplicationRequest {
  scholarshipId: number;
}

export interface UpdateApplicationRequest {
  status?: ApplicationStatus;
  comments?: string;
}

export interface SubmitApplicationRequest {
  applicationId: number;
}

// APPLICATION STATUS HISTORY
export interface ApplicationStatusHistory {
  id: number;
  applicationId: number;
  previousStatus?: ApplicationStatus;
  newStatus: ApplicationStatus;
  changedBy: number;
  notes?: string;
  createdAt: Date;
}

// UPLOADED DOCUMENT
export interface UploadedDocument {
  id: number;
  applicationId?: number;
  userId: number;
  documentType?: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  fileType?: string;
  verificationStatus: DocumentVerificationStatus;
  verifiedBy?: number;
  verifiedAt?: Date;
  verificationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentUploadRequest {
  applicationId?: number;
  documentType: string;
  file: File;
}

// SCHOLAR
export interface Scholar {
  id: number;
  userId: number;
  scholarshipId: number;
  scholarIdNumber?: string;
  approvalDate?: Date;
  qrCode?: string;
  status: ScholarStatus;
  createdAt: Date;
  updatedAt: Date;
  scholarshipName?: string;
  studentName?: string;
  studentEmail?: string;
}

// GRADE
export interface Grade {
  id: number;
  scholarId: number;
  academicYear?: string;
  semester?: string;
  gpa?: number;
  subjectDetails?: any;
  uploadedBy?: number;
  uploadedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitGradeRequest {
  scholarId: number;
  academicYear: string;
  semester: string;
  gpa: number;
  subjectDetails?: any;
}

// RENEWAL
export interface Renewal {
  id: number;
  scholarId: number;
  academicYear?: string;
  semester?: string;
  status: RenewalStatus;
  submissionDate?: Date;
  reviewedBy?: number;
  reviewedAt?: Date;
  decision?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRenewalRequest {
  scholarId: number;
  academicYear: string;
  semester: string;
}

export interface ReviewRenewalRequest {
  renewalId: number;
  decision: 'approved' | 'rejected';
  notes?: string;
}

// ALLOWANCE
export interface Allowance {
  id: number;
  scholarId: number;
  academicYear?: string;
  semester?: string;
  amount: number;
  paymentDate?: Date;
  status: AllowanceStatus;
  releaseDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAllowanceRequest {
  scholarId: number;
  academicYear: string;
  semester: string;
  amount: number;
  paymentDate?: string;
}

// VIOLATION
export interface Violation {
  id: number;
  scholarId: number;
  violationType?: string;
  description?: string;
  severity?: ViolationSeverity;
  actionTaken?: string;
  resolved: boolean;
  resolvedDate?: Date;
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateViolationRequest {
  scholarId: number;
  violationType: string;
  description: string;
  severity: ViolationSeverity;
  actionTaken: string;
}

// ANNOUNCEMENT
export interface Announcement {
  id: number;
  title: string;
  content: string;
  announcementType?: AnnouncementType;
  pinned: boolean;
  pinnedUntil?: Date;
  createdBy: number;
  publishedAt?: Date;
  imageUrl?: string;
  attachments?: AnnouncementAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnouncementAttachment {
  id: number;
  announcementId: number;
  fileName: string;
  filePath: string;
  fileType: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  announcementType: AnnouncementType;
  imageUrl?: string;
  pinned?: boolean;
  pinnedUntil?: string;
}

// NOTIFICATION
export interface Notification {
  id: number;
  userId: number;
  title?: string;
  message?: string;
  notificationType?: NotificationType;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  createdAt: Date;
}

// AUDIT LOG
export interface AuditLog {
  id: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId: number;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// DASHBOARD STATS
export interface DashboardStats {
  totalScholars: number;
  activeScholars: number;
  graduatedScholars: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  scholarshipUtilization: number;
  renewalsDue: number;
}

// API RESPONSE WRAPPERS
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// PAGINATION
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// FILTERS
export interface ApplicationFilters extends PaginationParams {
  status?: ApplicationStatus;
  scholarshipId?: number;
  applicantId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ScholarFilters extends PaginationParams {
  status?: ScholarStatus;
  scholarshipId?: number;
  municipality?: string;
  academicYear?: string;
}

export interface AnnouncementFilters extends PaginationParams {
  type?: AnnouncementType;
  pinned?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// ERROR
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}
