# Scholarship Management System - Implementation Guide

## Overview

This document provides a roadmap for completing the scholarship management system from the current starter state to a production-ready application.

## Current Status

✓ Project scaffolding and structure
✓ Authentication framework (JWT)
✓ Role-based access control (RBAC)
✓ Database schema
✓ API routes and middleware
✓ Frontend starter pages
✓ Type definitions

## Phase 1: Database Integration (1-2 weeks)

### 1.1 Set Up Prisma ORM

```bash
npm install @prisma/client prisma
npx prisma init
```

### 1.2 Configure Database Connection

Update `server/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/scholarship_db"
```

### 1.3 Create Prisma Schema

Create `server/prisma/schema.prisma` based on `database_schema.sql`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  firstName String
  lastName  String
  role      String  // super_admin, admin, applicant
  status    String  @default("active")
  // ... other fields
  applicant Applicant?
  // ... relationships
}

model Applicant {
  id     Int  @id @default(autoincrement())
  userId Int  @unique
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... other fields
}

// ... other models
```

### 1.4 Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 1.5 Update Services with Prisma

Replace mock data in services with actual database queries:

```typescript
// Before (mock)
private mockUsers: User[] = [...]

// After (Prisma)
async getUser(id: number) {
  return this.prisma.user.findUnique({
    where: { id }
  });
}
```

---

## Phase 2: Complete API Implementation (2-3 weeks)

### 2.1 Applications Module

File: `server/src/services/ApplicationService.ts`

```typescript
export class ApplicationService {
  async createApplication(applicantId: number, scholarshipId: number) {
    // Create application in draft status
  }

  async submitApplication(applicationId: number) {
    // Change status to submitted and log event
  }

  async updateApplicationStatus(
    applicationId: number,
    newStatus: ApplicationStatus,
    reviewedBy: number,
    comments?: string
  ) {
    // Update status with validation and history
  }

  async getApplicationHistory(applicationId: number) {
    // Return all status changes
  }
}
```

### 2.2 Document Upload Module

File: `server/src/services/DocumentService.ts`

```typescript
export class DocumentService {
  async uploadDocument(
    applicationId: number,
    documentType: string,
    file: Express.Multer.File,
    userId: number
  ) {
    // Validate file
    // Store file (S3 or local)
    // Create database record
    // Return document metadata
  }

  async verifyDocument(
    documentId: number,
    verificationStatus: DocumentVerificationStatus,
    verifiedBy: number,
    notes?: string
  ) {
    // Update verification status
  }

  async getDocumentsByApplication(applicationId: number) {
    // Return all documents for application
  }
}
```

Add file upload middleware:

```bash
npm install multer
npm install --save-dev @types/multer
```

### 2.3 Scholar Management Module

File: `server/src/services/ScholarService.ts`

```typescript
export class ScholarService {
  async createScholar(userId: number, scholarshipId: number) {
    // Create scholar record from approved applicant
    // Generate scholar ID number
    // Generate QR code
  }

  async submitGrade(scholarId: number, gradeData: GradeData) {
    // Record semester grade
  }

  async requestRenewal(scholarId: number, renewalData: RenewalData) {
    // Create renewal request
  }

  async approveRenewal(renewalId: number, reviewedBy: number) {
    // Approve renewal
  }

  async releaseAllowance(allowanceId: number) {
    // Mark allowance as released
  }
}
```

### 2.4 Add Routes for All Modules

Update `server/src/routes.ts`:

```typescript
// Applications
router.post('/applications', verifyToken, requireRole([UserRole.APPLICANT]), createApplication);
router.post('/applications/:id/submit', verifyToken, submitApplication);
router.put('/applications/:id', verifyToken, requireAdmin, updateApplicationStatus);

// Documents
router.post('/documents/upload', verifyToken, uploadDocument);
router.put('/documents/:id/verify', verifyToken, requireAdmin, verifyDocument);

// Scholars
router.post('/scholars/:id/grades', verifyToken, submitGrade);
router.post('/renewals', verifyToken, requestRenewal);
router.put('/renewals/:id', verifyToken, requireAdmin, reviewRenewal);

// Announcements
router.post('/announcements', verifyToken, requireAdmin, createAnnouncement);
router.get('/announcements', getAnnouncements);

// Notifications
router.get('/notifications', verifyToken, getNotifications);
router.post('/notifications/:id/read', verifyToken, markNotificationAsRead);
```

---

## Phase 3: Frontend Component Development (3-4 weeks)

### 3.1 Create Component Library

`client/src/components/`:

```
- Button.tsx          # Reusable button
- Input.tsx           # Form input
- Card.tsx            # Card wrapper
- Modal.tsx           # Modal dialog
- Table.tsx           # Data table
- Pagination.tsx      # Pagination
- LoadingSpinner.tsx  # Loading state
- EmptyState.tsx      # Empty state
- Notification.tsx    # Toast/alert
```

### 3.2 Create Layout Component

`client/src/components/Layout.tsx`:

```typescript
export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    apiService.getCurrentUser().then(setUser).catch(() => {
      navigate('/login');
    });
  }, []);

  return (
    <div className="layout">
      <Sidebar user={user} />
      <main className="main-content">{children}</main>
    </div>
  );
};
```

### 3.3 Application Workflow Pages

#### Create Application
`client/src/pages/CreateApplicationPage.tsx`

- Display available scholarships
- Show eligibility requirements
- Confirm application creation
- Redirect to draft application

#### Application Details
`client/src/pages/ApplicationDetailsPage.tsx`

- Show application status
- Display status history
- Upload documents
- Submit application
- View admin comments

#### Document Upload
`client/src/pages/DocumentUploadPage.tsx`

- List required documents
- Drag-and-drop upload
- File preview
- Verification status
- Download/delete documents

### 3.4 Admin Pages

#### Application Review
`client/src/pages/ApplicationReviewPage.tsx`

- List pending applications
- Filter by status, scholarship, date
- Review application details
- View documents with verification checklist
- Approve/reject with comments
- Request revisions

#### Scholar Management
`client/src/pages/ScholarManagementPage.tsx`

- List active scholars
- View scholar grades
- Track allowances
- Monitor renewals
- Record violations
- Update compliance status

#### Program Management
`client/src/pages/ProgramManagementPage.tsx`

- Create scholarship program
- Edit program details
- Set application period
- Configure required documents
- View program statistics

### 3.5 Dashboard Enhancements

#### Super Admin Dashboard
`client/src/pages/AdminDashboard/SuperAdminDashboard.tsx`

```typescript
- Key metrics (scholars, applications, approvals)
- Charts (approvals over time, utilization)
- Recent activity logs
- System health
- User management shortcut
```

#### Regular Admin Dashboard
`client/src/pages/AdminDashboard/AdminDashboard.tsx`

```typescript
- Pending reviews
- Recent applications
- Missing documents alerts
- Renewals due
- Allowance status
```

#### Applicant Dashboard
`client/src/pages/ApplicantDashboard.tsx`

```typescript
- My applications (with status)
- Renewal status
- Scholarship details
- Allowance status
- Notifications
- Announcements
```

---

## Phase 4: Advanced Features (2-3 weeks)

### 4.1 Email Notifications

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

File: `server/src/services/EmailService.ts`

```typescript
export class EmailService {
  async sendApplicationStatusEmail(
    userEmail: string,
    applicationStatus: ApplicationStatus,
    scholarshipName: string
  ) {
    // Send email notification
  }

  async sendRenewalReminderEmail(userEmail: string, dueDate: Date) {
    // Send renewal deadline reminder
  }

  async sendAllowanceReleaseEmail(userEmail: string, amount: number) {
    // Notify scholar about allowance release
  }
}
```

### 4.2 File Storage (AWS S3)

```bash
npm install aws-sdk
```

File: `server/src/services/StorageService.ts`

```typescript
export class StorageService {
  async uploadFile(
    key: string,
    file: Express.Multer.File
  ): Promise<{ url: string }> {
    // Upload to S3 with ACL
  }

  async getSignedUrl(key: string): Promise<string> {
    // Generate temporary download URL
  }

  async deleteFile(key: string): Promise<void> {
    // Delete file from S3
  }
}
```

### 4.3 Reports and Export

File: `server/src/services/ReportService.ts`

```typescript
export class ReportService {
  async generateApprovedScholarsReport(
    filters: ReportFilters
  ): Promise<Buffer> {
    // Generate PDF with applicant details
  }

  async exportToExcel(
    data: any[],
    columns: string[]
  ): Promise<Buffer> {
    // Create Excel file
  }

  async generateStatisticsReport(): Promise<any> {
    // Create analytics report
  }
}
```

### 4.4 QR Code Generation

```bash
npm install qrcode
```

```typescript
async generateScholarQRCode(scholarId: string): Promise<string> {
  const qrCode = await QRCode.toDataURL(scholarId);
  return qrCode; // Data URL for display/print
}
```

### 4.5 Pagination and Filtering

Enhance all list endpoints with:

```typescript
interface QueryParams {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  // Filter fields
}

// Apply to queries
const skip = (page - 1) * pageSize;
const data = await prisma.model.findMany({
  where: buildFilters(filters),
  skip,
  take: pageSize,
  orderBy: { [sortBy]: sortOrder }
});
```

---

## Phase 5: Testing (1-2 weeks)

### 5.1 Unit Tests

```bash
npm install --save-dev jest ts-jest @types/jest
```

Example test:

```typescript
// server/src/__tests__/AuthService.test.ts
describe('AuthService', () => {
  it('should login with valid credentials', async () => {
    const service = new AuthService();
    const result = await service.login({
      email: 'admin@example.com',
      password: 'password123'
    });

    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('admin@example.com');
  });
});
```

### 5.2 Integration Tests

Test API endpoints with database:

```typescript
describe('POST /api/auth/login', () => {
  it('should return token and user on successful login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

### 5.3 Frontend Component Tests

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

---

## Phase 6: Deployment (1 week)

### 6.1 Docker Containerization

`Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4000

CMD ["npm", "run", "start"]
```

### 6.2 Docker Compose

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/scholarship
      JWT_SECRET: ${JWT_SECRET}

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: scholarship
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 6.3 Environment Variables

Create `.env.production`:

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=<strong-random-key>
DATABASE_URL=<production-database-url>
CORS_ORIGIN=https://yourdomain.com
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
AWS_S3_BUCKET=<bucket-name>
SMTP_HOST=<email-service>
SMTP_USER=<email>
SMTP_PASS=<password>
```

### 6.4 Deployment Targets

- **Backend**: AWS ECS, Heroku, DigitalOcean, Railway
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Database**: AWS RDS PostgreSQL, DigitalOcean Managed Database

---

## Checklist

### Authentication & Security
- [ ] Test all login flows (Super Admin, Admin, Applicant)
- [ ] Verify role-based access control
- [ ] Test token expiration and refresh
- [ ] Implement password reset email flow
- [ ] Add email verification flow
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Add request logging/audit trail

### Database
- [ ] Connect Prisma to PostgreSQL
- [ ] Create and run migrations
- [ ] Seed test data
- [ ] Set up database backups
- [ ] Test data relationships
- [ ] Verify indexes

### API
- [ ] Implement all CRUD endpoints
- [ ] Add validation on all inputs
- [ ] Test all error scenarios
- [ ] Document all endpoints
- [ ] Test pagination and filtering
- [ ] Verify response formats

### Frontend
- [ ] Create all required pages
- [ ] Implement responsive design
- [ ] Test on mobile/tablet
- [ ] Add loading states
- [ ] Add error handling
- [ ] Implement notifications
- [ ] Test forms validation
- [ ] Add dark mode (optional)

### Features
- [ ] Document upload and verification
- [ ] Email notifications
- [ ] Reports and export (PDF/Excel)
- [ ] QR code generation
- [ ] Announcement system
- [ ] Renewal workflow
- [ ] Allowance tracking
- [ ] Compliance monitoring

### Testing
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] API tests
- [ ] Component tests
- [ ] E2E tests

### Deployment
- [ ] Docker setup
- [ ] Environment configuration
- [ ] Database migrations in production
- [ ] Monitoring and logging
- [ ] Backup strategy
- [ ] SSL/TLS certificates
- [ ] CI/CD pipeline

---

## Performance Optimization

1. **Database**: Add indexes on frequently queried fields
2. **Frontend**: Code splitting, lazy loading, image optimization
3. **API**: Response caching, database query optimization
4. **Server**: Gzip compression, CORS preflight caching

---

## Security Considerations

1. **Input Validation**: Use Joi or Zod for schema validation
2. **SQL Injection**: Use Prisma's parameterized queries
3. **XSS**: React automatically escapes values
4. **CSRF**: Add CSRF middleware
5. **Secrets**: Use environment variables, never commit secrets
6. **HTTPS**: Force SSL in production
7. **Password Policy**: Enforce strong password requirements
8. **Session Security**: Implement proper token refresh

---

## Support Resources

- Prisma Documentation: https://www.prisma.io/docs/
- Express.js Guide: https://expressjs.com/
- React Documentation: https://react.dev/
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- PostgreSQL Manual: https://www.postgresql.org/docs/

---

## Next Steps

1. Set up PostgreSQL and connect with Prisma
2. Implement database layer with services
3. Build out API endpoints
4. Create frontend pages and components
5. Add email notifications
6. Implement file uploads to cloud storage
7. Add testing suite
8. Containerize and deploy

Estimated timeline: 3-4 months for full production-ready application
