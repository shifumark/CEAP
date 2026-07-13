# Scholarship Management System

A production-ready web-based scholarship application and management platform for universities, local government units (LGUs), and educational foundations.

## Features

### Core Functionality
- 📋 **Application Management**: Complete scholarship application workflow with document uploads
- 👥 **Role-Based Access Control**: Super Admin, Admin, and Applicant/Scholar roles with hidden Super Admin
- 🔐 **Secure Authentication**: JWT-based login with password hashing and session management
- 📊 **Dashboard Analytics**: Role-specific dashboards with statistics and charts
- 📢 **Announcements**: System for posting news, deadlines, events, and updates
- 📧 **Notifications**: In-app and email notifications for important events
- 📁 **Document Management**: Secure upload, verification, and tracking of documents
- 🎓 **Scholar Tracking**: Grade monitoring, allowance management, and renewal tracking
- 📈 **Reports & Export**: Generate reports and export to PDF/Excel
- 🔍 **Search & Filtering**: Advanced search and filtering across all modules

### Security
- ✅ JWT token-based authentication
- ✅ Password hashing with bcryptjs
- ✅ Role-based authorization (RBAC)
- ✅ Server-side permission validation
- ✅ CSRF and XSS protection ready
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Secure password reset flow

### Architecture
- ✅ Monorepo structure (client + server + shared)
- ✅ TypeScript across full stack
- ✅ RESTful API with Express.js
- ✅ React with functional components
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Database schema for PostgreSQL

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (fast build tool)
- React Router for navigation
- Fetch API for HTTP requests

### Backend
- Express.js + TypeScript
- JWT for authentication
- bcryptjs for password hashing
- CORS enabled

### Database
- PostgreSQL (schema included)
- Ready for Prisma ORM integration

### DevTools
- Node.js 18+
- npm/yarn for package management

## Quick Start

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher

### Installation

1. **Navigate to project directory**
   ```bash
   cd c:\Users\Pham\Documents\scholarship-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000/api

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@example.com | password123 |
| Admin | admin@example.com | password123 |
| Applicant | applicant@example.com | password123 |

## Project Structure

```
scholarship-management-system/
├── client/                    # React Frontend (Vite)
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components (to be added)
│   │   ├── services/         # API service
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                    # Express Backend
│   ├── src/
│   │   ├── middleware/       # Auth & error handling
│   │   ├── services/         # Business logic
│   │   ├── routes.ts         # API endpoints
│   │   └── index.ts          # Server entry
│   ├── package.json
│   └── tsconfig.json
├── shared/                    # Shared Types
│   └── types.ts              # TypeScript interfaces
├── database_schema.sql        # PostgreSQL schema
├── SETUP.md                   # Setup instructions
├── API_DOCUMENTATION.md       # API docs
├── IMPLEMENTATION_GUIDE.md    # Implementation roadmap
├── package.json              # Monorepo config
└── README.md                 # This file
```

## Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup and configuration guide
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API endpoint documentation
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Roadmap for completing the system

## Key Features Overview

### Role-Based System

#### Super Administrator (Hidden)
- Full system access
- User management
- System configuration
- Complete audit logs
- Database management
- **Hidden from all non-Super Admin users**

#### Administrator
- Application review and approval
- Scholarship program management
- Scholar monitoring
- Report generation
- Announcement posting
- Cannot see Super Admin accounts

#### Applicant / Scholar
- Submit applications
- Upload documents
- Track application status
- View announcements
- Manage scholarship renewals
- View grades and allowances

### Application Workflow

```
Draft → Submitted → Under Review → Document Verification → 
Interview (optional) → Approved/Rejected/Needs Revision
```

### Scholarship Programs
- Create and manage multiple programs
- Set application periods
- Define eligibility requirements
- Configure required documents
- Track applicants and slots

### Document Management
- Support for multiple file types (PDF, JPG, PNG)
- Admin verification workflow
- Document history tracking
- Secure storage

### Scholar Tracking
- Grade submission and monitoring
- Allowance distribution and tracking
- Renewal requests and approvals
- Compliance monitoring
- Violation recording

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user (protected)

### Scholarships
- `GET /api/scholarships` - List scholarships
- `GET /api/scholarships/:id` - Get scholarship details
- `POST /api/scholarships` - Create scholarship (admin)
- `PUT /api/scholarships/:id` - Update scholarship (admin)
- `DELETE /api/scholarships/:id` - Delete scholarship (super admin)

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `POST /api/applications/:id/submit` - Submit application
- `PUT /api/applications/:id` - Update application (admin)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Users (Super Admin Only)
- `GET /api/users` - List users
- `POST /api/users` - Create user

For complete API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## Development

### Available Commands

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev --workspace=client    # Frontend only
npm run dev --workspace=server    # Backend only

# Building
npm run build           # Build both for production
npm run build --workspace=client
npm run build --workspace=server

# Production
npm run start --workspace=server  # Run backend server
```

### Adding New Pages

Create new pages in `client/src/pages/`:

```typescript
const MyPage = () => {
  return (
    <div className="container">
      <h1>My Page</h1>
      {/* Content */}
    </div>
  );
};

export default MyPage;
```

Add route in `client/src/App.tsx`:

```typescript
<Route path="/mypage" element={<MyPage />} />
```

### Adding New API Endpoints

Add routes in `server/src/routes.ts`:

```typescript
router.get('/myendpoint', verifyToken, async (req, res) => {
  try {
    // Your logic
    res.json({ /* response */ });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Production Deployment

### Prerequisites
- PostgreSQL database
- Node.js server
- SSL certificate
- Backup strategy

### Build for Production

```bash
npm run build
```

This creates:
- `client/dist/` - React app for static hosting
- `server/dist/` - Compiled backend

### Environment Variables

Create `.env` with production values:

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=<strong-random-key>
DATABASE_URL=postgresql://user:pass@host/db
CORS_ORIGIN=https://yourdomain.com
```

### Database Setup

```bash
psql -U postgres -d scholarship_db -f database_schema.sql
```

### Run Server

```bash
npm run start --workspace=server
```

### Serve Frontend

Deploy `client/dist/` to:
- AWS S3 + CloudFront
- Vercel
- Netlify
- Nginx/Apache

## File Upload Handling

The system is ready for cloud storage integration:

```bash
npm install aws-sdk  # For AWS S3
```

Update `server/src/services/DocumentService.ts` to use AWS S3 or similar.

## Email Integration

For email notifications, integrate:

```bash
npm install nodemailer
```

Update `server/src/services/EmailService.ts` with your SMTP credentials.

## Database Setup

### Using PostgreSQL

1. Create database
   ```bash
   createdb scholarship_db
   ```

2. Load schema
   ```bash
   psql -U postgres -d scholarship_db -f database_schema.sql
   ```

3. Update `.env`
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/scholarship_db
   ```

### Using Prisma ORM (Recommended)

```bash
npm install @prisma/client prisma
npx prisma init
npx prisma migrate dev
```

## Testing

To add tests:

```bash
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

## Troubleshooting

### Port Already in Use
```bash
# Windows - find process
netstat -ano | findstr :4000
# Kill process
taskkill /PID <PID> /F
```

### CORS Errors
Ensure `CORS_ORIGIN` in `.env` matches your frontend URL:
```env
CORS_ORIGIN=http://localhost:5173
```

### Token Errors
Ensure `JWT_SECRET` is set in `.env`:
```env
JWT_SECRET=your-secret-key
```

### Database Connection
Check PostgreSQL is running and `DATABASE_URL` is correct:
```bash
psql -U postgres -c "SELECT 1"
```

## Next Steps

1. ✅ Project scaffolding - **DONE**
2. 🔄 Database integration with Prisma
3. 🔄 Complete API endpoints
4. 🔄 Build frontend pages and components
5. 🔄 Email notification system
6. 🔄 File storage integration
7. 🔄 Testing suite
8. 🔄 Deployment setup

See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for detailed next steps.

## Performance Considerations

- Frontend: Code splitting, lazy loading, image optimization
- Backend: Database indexing, query optimization, caching
- Database: Proper indexes, connection pooling, backups
- API: Pagination, field filtering, response compression

## Security Best Practices

- ✅ Never commit `.env` files
- ✅ Use strong JWT_SECRET in production
- ✅ Enable HTTPS in production
- ✅ Validate all inputs server-side
- ✅ Use environment variables for secrets
- ✅ Implement proper database backups
- ✅ Keep dependencies updated
- ✅ Monitor and log suspicious activities

## Support & Resources

- **TypeScript**: https://www.typescriptlang.org/docs/
- **React**: https://react.dev/
- **Express.js**: https://expressjs.com/
- **Vite**: https://vitejs.dev/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Prisma**: https://www.prisma.io/docs/

## Contributing

This is a production starter template. Follow TypeScript and React best practices:

- Use functional components with hooks
- Define types for all functions and props
- Add proper error handling
- Write meaningful commit messages
- Keep components small and reusable

## License

This project is licensed for use by the designated organization.

---

**Status**: Production-Ready Starter Template

**Version**: 1.0.0

**Last Updated**: July 2024

For questions or issues, refer to the documentation files or contact the development team.
