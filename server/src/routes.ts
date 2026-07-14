import express from 'express';
import { AuthenticatedRequest, verifyToken, requireRole, requireAdmin, requireSuperAdmin } from './middleware/auth.js';
import { upload } from './middleware/upload.js';
import { AuthService } from './services/AuthService.js';
import { ScholarshipService } from './services/ScholarshipService.js';
import { ApplicationService } from './services/ApplicationService.js';
import { ApplicantService } from './services/ApplicantService.js';
import { DocumentService } from './services/DocumentService.js';
import { ScholarService } from './services/ScholarService.js';
import { AnnouncementService } from './services/AnnouncementService.js';
import { NotificationService } from './services/NotificationService.js';
import { prisma } from './lib/prisma.js';
import {
  UserRole,
  LoginRequest,
  CreateScholarshipProgramRequest,
  CreateApplicationRequest,
  ApplicationFilters,
  ApplicationStatus,
  DocumentVerificationStatus,
  ScholarFilters,
  SubmitGradeRequest,
  CreateRenewalRequest,
  ReviewRenewalRequest,
  CreateAllowanceRequest,
  CreateViolationRequest,
  CreateAnnouncementRequest,
  AnnouncementFilters,
  UpdateApplicantProfileRequest
} from './types.js';

const router = express.Router();
const authService = new AuthService();
const scholarshipService = new ScholarshipService();
const applicationService = new ApplicationService();
const applicantService = new ApplicantService();
const documentService = new DocumentService();
const scholarService = new ScholarService();
const announcementService = new AnnouncementService();
const notificationService = new NotificationService();

// ============== AUTHENTICATION ROUTES ==============

/**
 * Login endpoint
 * Public - no authentication required
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const response = await authService.login({ email, password });
    res.json(response);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

/**
 * Register endpoint
 * Public - no authentication required
 */
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await authService.register({
      email,
      password,
      firstName,
      lastName,
      role: UserRole.APPLICANT
    });

    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

/**
 * Verify token and get current user
 * Protected - requires valid JWT
 */
router.get('/auth/me', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await authService.getUser(req.user!.sub);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Request password reset
 * Public
 */
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // In production, generate reset token and send email
    res.json({ message: 'Password reset link sent to email' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============== SCHOLARSHIP PROGRAM ROUTES ==============

/**
 * Get all scholarship programs
 * Public - visible to all users
 */
router.get('/scholarships', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const result = await scholarshipService.getPrograms({ page, pageSize });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single scholarship program
 * Public
 */
router.get('/scholarships/:id', async (req, res) => {
  try {
    const program = await scholarshipService.getProgramById(parseInt(req.params.id));

    if (!program) {
      return res.status(404).json({ error: 'Scholarship not found' });
    }

    res.json(program);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get the list of required documents for a scholarship program
 * Public - shown before a student applies
 */
router.get('/scholarships/:id/required-documents', async (req, res) => {
  try {
    const documents = await scholarshipService.getRequiredDocuments(parseInt(req.params.id));
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create new scholarship program
 * Protected - requires admin or super admin role
 */
router.post('/scholarships', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const request: CreateScholarshipProgramRequest = req.body;

    if (!request.name || !request.description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const program = await scholarshipService.createProgram(req.user!.sub, request);
    res.status(201).json(program);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update scholarship program
 * Protected - requires admin or super admin role
 */
router.put('/scholarships/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const program = await scholarshipService.updateProgram(parseInt(req.params.id), req.body);

    if (!program) {
      return res.status(404).json({ error: 'Scholarship not found' });
    }

    res.json(program);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete scholarship program
 * Protected - requires super admin role
 */
router.delete('/scholarships/:id', verifyToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await scholarshipService.deleteProgram(parseInt(req.params.id));

    if (!success) {
      return res.status(404).json({ error: 'Scholarship not found' });
    }

    res.json({ message: 'Scholarship deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============== APPLICANT PROFILE ROUTES ==============

/**
 * Get the requesting user's own applicant profile (school/course/year/
 * address, etc). Creates an empty profile on first access.
 * Protected - self-scoped only
 */
router.get('/applicants/me', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await applicantService.getOrCreateForUser(req.user!.sub);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update the requesting user's own applicant profile
 * Protected - self-scoped only
 */
router.put('/applicants/me', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const request: UpdateApplicantProfileRequest = req.body;

    if (!request.schoolName || !request.yearLevel || !request.courseName || !request.address) {
      return res.status(400).json({ error: 'schoolName, yearLevel, courseName, and address are required' });
    }

    const profile = await applicantService.updateProfile(req.user!.sub, request);
    res.json(profile);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============== APPLICATION ROUTES ==============

/**
 * List applications
 * Protected - Students only ever see their own (enforced in the service
 * layer, not just here); Admin/Super Admin see all, optionally filtered.
 */
router.get('/applications', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const filters: ApplicationFilters = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      status: (req.query.status as ApplicationStatus) || undefined,
      scholarshipId: req.query.scholarshipId ? parseInt(req.query.scholarshipId as string) : undefined,
      applicantId: req.query.applicantId ? parseInt(req.query.applicantId as string) : undefined
    };

    const result = await applicationService.listApplications(req.user!, filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a single application
 * Protected - ownership enforced server-side; a Student requesting another
 * applicant's id gets 404, never the record or a leaky 403.
 */
router.get('/applications/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const application = await applicationService.getById(req.user!, parseInt(req.params.id));

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get an application's status history
 * Protected - same ownership rule as GET /applications/:id
 */
router.get('/applications/:id/history', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const history = await applicationService.getHistory(req.user!, parseInt(req.params.id));
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Withdraw (delete) an application
 * Protected - Students only, ownership enforced server-side; blocked once
 * the application has a final decision (approved/rejected)
 */
router.delete('/applications/:id', verifyToken, requireRole([UserRole.APPLICANT]), async (req: AuthenticatedRequest, res) => {
  try {
    const deleted = await applicationService.deleteApplication(req.user!, parseInt(req.params.id));

    if (!deleted) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create a new application (starts as draft)
 * Protected - Students only
 */
router.post(
  '/applications',
  verifyToken,
  requireRole([UserRole.APPLICANT]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { scholarshipId } = req.body as CreateApplicationRequest;

      if (!scholarshipId) {
        return res.status(400).json({ error: 'scholarshipId is required' });
      }

      const application = await applicationService.createApplication(req.user!, { scholarshipId });
      res.status(201).json(application);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Submit a draft (or needs-revision) application
 * Protected - Students only; ownership enforced server-side
 */
router.post(
  '/applications/:id/submit',
  verifyToken,
  requireRole([UserRole.APPLICANT]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const application = await applicationService.submitApplication(req.user!, parseInt(req.params.id));
      res.json(application);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Update an application's status/comments (the review decision)
 * Protected - Admin/Super Admin only
 */
router.put('/applications/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const application = await applicationService.updateStatus(req.user!, parseInt(req.params.id), req.body);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============== DOCUMENT ROUTES ==============

/**
 * List documents uploaded for an application
 * Protected - ownership enforced server-side via ApplicationService
 */
router.get('/applications/:id/documents', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const documents = await documentService.listByApplication(req.user!, parseInt(req.params.id));
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Upload a document for an application
 * Protected - Students only; ownership enforced server-side
 */
router.post(
  '/documents/upload',
  verifyToken,
  requireRole([UserRole.APPLICANT]),
  upload.single('file'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const applicationId = parseInt(req.body.applicationId);
      const documentType = req.body.documentType;

      if (!applicationId || !documentType) {
        return res.status(400).json({ error: 'applicationId and documentType are required' });
      }

      const document = await documentService.upload(req.user!, applicationId, documentType, {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      res.status(201).json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Delete an uploaded document
 * Protected - owner (Student) or Admin/Super Admin; ownership enforced
 * server-side
 */
router.delete('/documents/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const deleted = await documentService.delete(req.user!, parseInt(req.params.id));

    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Download a document. Streams the file bytes directly for Drive-backed
 * documents (never exposes a public Drive link — access stays gated
 * behind our own auth); redirects to a short-lived signed URL for any
 * legacy document still on Supabase Storage.
 * Protected - ownership enforced server-side
 */
router.get('/documents/:id/download', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await documentService.getDownload(req.user!, parseInt(req.params.id));

    if (result.kind === 'redirect') {
      return res.redirect(result.url);
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(result.fileName)}"`);
    (result.stream as NodeJS.ReadableStream).pipe(res);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * Verify (or reject) a document
 * Protected - Admin/Super Admin only
 */
router.put('/documents/:id/verify', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, notes } = req.body as { status: DocumentVerificationStatus; notes?: string };

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const document = await documentService.verify(req.user!, parseInt(req.params.id), status, notes);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============== SCHOLAR ROUTES ==============

/**
 * Get the requesting user's own scholar record, if any
 * Protected - any authenticated user
 */
router.get('/scholars/me', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const scholar = await scholarService.getMyRecord(req.user!);

    if (!scholar) {
      return res.status(404).json({ error: 'No scholar record found' });
    }

    res.json(scholar);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all scholars
 * Protected - Admin/Super Admin only
 */
router.get('/scholars', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const filters: ScholarFilters = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      status: (req.query.status as any) || undefined,
      scholarshipId: req.query.scholarshipId ? parseInt(req.query.scholarshipId as string) : undefined
    };

    const result = await scholarService.listScholars(req.user!, filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a single scholar record
 * Protected - ownership enforced server-side
 */
router.get('/scholars/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const scholar = await scholarService.getById(req.user!, parseInt(req.params.id));

    if (!scholar) {
      return res.status(404).json({ error: 'Scholar not found' });
    }

    res.json(scholar);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Grades
 */
router.get('/scholars/:id/grades', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const grades = await scholarService.listGrades(req.user!, parseInt(req.params.id));
    res.json(grades);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scholars/:id/grades', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const request: SubmitGradeRequest = { ...req.body, scholarId: parseInt(req.params.id) };
    const grade = await scholarService.submitGrade(req.user!, request);
    res.status(201).json(grade);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Renewals
 */
router.get('/scholars/:id/renewals', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const renewals = await scholarService.listRenewals(req.user!, parseInt(req.params.id));
    res.json(renewals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scholars/:id/renewals', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const request: CreateRenewalRequest = { ...req.body, scholarId: parseInt(req.params.id) };
    const renewal = await scholarService.requestRenewal(req.user!, request);
    res.status(201).json(renewal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/renewals/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const request: ReviewRenewalRequest = { ...req.body, renewalId: parseInt(req.params.id) };
    const renewal = await scholarService.reviewRenewal(req.user!, parseInt(req.params.id), request);

    if (!renewal) {
      return res.status(404).json({ error: 'Renewal not found' });
    }

    res.json(renewal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Allowances
 */
router.get('/scholars/:id/allowances', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const allowances = await scholarService.listAllowances(req.user!, parseInt(req.params.id));
    res.json(allowances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scholars/:id/allowances', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const request: CreateAllowanceRequest = { ...req.body, scholarId: parseInt(req.params.id) };
    const allowance = await scholarService.createAllowance(req.user!, request);
    res.status(201).json(allowance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/allowances/:id/release', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const allowance = await scholarService.releaseAllowance(req.user!, parseInt(req.params.id));

    if (!allowance) {
      return res.status(404).json({ error: 'Allowance not found' });
    }

    res.json(allowance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Violations
 */
router.get('/scholars/:id/violations', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const violations = await scholarService.listViolations(req.user!, parseInt(req.params.id));
    res.json(violations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scholars/:id/violations', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const request: CreateViolationRequest = { ...req.body, scholarId: parseInt(req.params.id) };
    const violation = await scholarService.createViolation(req.user!, request);
    res.status(201).json(violation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============== ANNOUNCEMENT ROUTES ==============

/**
 * List announcements (pinned first, most recent first)
 * Protected - any authenticated user
 */
router.get('/announcements', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const filters: AnnouncementFilters = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      type: (req.query.type as any) || undefined,
      pinned: req.query.pinned === 'true' ? true : req.query.pinned === 'false' ? false : undefined
    };

    const result = await announcementService.list(filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/announcements/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const announcement = await announcementService.getById(parseInt(req.params.id));

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create an announcement (publishes immediately and notifies all students)
 * Protected - Admin/Super Admin only
 */
router.post('/announcements', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const request: CreateAnnouncementRequest = req.body;

    if (!request.title || !request.content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcement = await announcementService.create(req.user!.sub, request);
    res.status(201).json(announcement);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/announcements/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const announcement = await announcementService.update(parseInt(req.params.id), req.body);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/announcements/:id', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await announcementService.delete(parseInt(req.params.id));

    if (!success) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============== NOTIFICATION ROUTES ==============

/**
 * List the requesting user's own notifications
 * Protected - self-scoped only, no id-based lookup exists for this resource
 */
router.get('/notifications', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = await notificationService.listForUser(req.user!);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/read-all', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const count = await notificationService.markAllAsRead(req.user!);
    res.json({ updated: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/:id/read', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const notification = await notificationService.markAsRead(req.user!, parseInt(req.params.id));

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============== DASHBOARD ROUTES ==============

/**
 * Get dashboard stats
 * Protected - requires authentication
 * Super Admin sees full stats, Admin sees admin stats, Applicants see personal stats
 */
router.get('/dashboard/stats', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Stats vary based on user role
    // Super Admin and Admin would see system-wide stats
    // Applicants would see only their stats
    const isSuperAdmin = req.user!.role === UserRole.SUPER_ADMIN;
    const isAdmin = req.user!.role === UserRole.ADMIN || isSuperAdmin;

    let stats: any;

    if (isAdmin) {
      const [pending, approved, rejected, totalScholars, activeScholars, graduatedScholars, renewalsDue] =
        await Promise.all([
          prisma.application.count({
            where: { status: { in: ['submitted', 'under_review', 'document_verification', 'interview'] } }
          }),
          prisma.application.count({ where: { status: 'approved' } }),
          prisma.application.count({ where: { status: 'rejected' } }),
          prisma.scholar.count(),
          prisma.scholar.count({ where: { status: 'active' } }),
          prisma.scholar.count({ where: { status: 'graduated' } }),
          prisma.renewal.count({ where: { status: 'pending' } })
        ]);

      stats = {
        totalScholars,
        activeScholars,
        graduatedScholars,
        pendingApplications: pending,
        approvedApplications: approved,
        rejectedApplications: rejected,
        // No per-program capacity target is tracked yet to compute a
        // meaningful utilization percentage against.
        scholarshipUtilization: 0,
        renewalsDue
      };
    } else {
      // Student view — most recently created application, if any.
      const applications = await applicationService.listApplications(req.user!, { page: 1, pageSize: 1 });
      const latest = applications.data[0];

      stats = {
        applicationStatus: latest?.status ?? null,
        scholarshipName: latest?.scholarshipName ?? null,
        gpa: null,
        renewalStatus: null,
        allowanceStatus: null
      };
    }

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============== USER MANAGEMENT ROUTES (Super Admin Only) ==============

/**
 * List all users (Admin/Super Admin only; excludes Super Admin accounts from Admin view)
 */
router.get('/users', verifyToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const includeHidden = req.user!.role === UserRole.SUPER_ADMIN;
    const users = await authService.getAllUsers(includeHidden);

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user by ID (Super Admin only)
 */
router.get('/users/:id', verifyToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await authService.getUser(parseInt(req.params.id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create new user (Super Admin only)
 */
router.post('/users', verifyToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await authService.register({
      email,
      password,
      firstName,
      lastName,
      role: role || UserRole.APPLICANT
    });

    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============== AUDIT LOG ROUTES ==============

/**
 * List audit log entries (system-wide activity trail)
 * Protected - Super Admin only
 */
router.get('/audit-logs', verifyToken, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 25;

    const where: { userId?: number; entityType?: string } = {};
    if (req.query.userId) where.userId = parseInt(req.query.userId as string);
    if (req.query.entityType) where.entityType = req.query.entityType as string;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({ data: items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;
