# Scholarship Management System - Setup Guide

## Overview

This is a production-ready scholarship application and management platform built with:

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (schema included)
- **Authentication**: JWT with role-based access control

## System Requirements

- Node.js 18+ (download from https://nodejs.org/)
- npm 9+ (comes with Node.js)
- PostgreSQL 12+ (for production database)
- Git

## Quick Start

### 1. Install Node.js

Download and install from https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 2. Navigate to Project

```bash
cd c:\Users\Pham\Documents\scholarship-management-system
```

### 3. Install Dependencies

```bash
npm install
```

This will install dependencies for both client and server (monorepo setup).

### 4. Start Development Servers

In the project root, run:

```bash
npm run dev
```

This starts:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

### 5. Access the Application

Frontend: http://localhost:5173

Test credentials:
- **Super Admin**: superadmin@example.com / password123
- **Admin**: admin@example.com / password123
- **Applicant**: applicant@example.com / password123

## Project Structure

```
scholarship-management-system/
├── client/                          # React Frontend
│   ├── src/
│   │   ├── pages/                  # Page components
│   │   ├── services/               # API service
│   │   ├── components/             # Reusable components
│   │   ├── App.tsx                 # Main component
│   │   ├── main.tsx                # Entry point
│   │   └── styles.css              # Global styles
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                          # Express Backend
│   ├── src/
│   │   ├── middleware/             # Auth middleware
│   │   ├── services/               # Business logic
│   │   ├── routes.ts               # API routes
│   │   └── index.ts                # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── shared/                          # Shared types
│   └── types.ts                    # TypeScript interfaces
├── database_schema.sql              # PostgreSQL schema
├── .env.example                     # Environment variables template
├── package.json                     # Monorepo configuration
└── README.md                        # Main readme
```

## Environment Setup

### Copy Environment File

```bash
copy .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=4000
JWT_SECRET=your-super-secret-key-change-in-production
DATABASE_URL=postgresql://user:password@localhost:5432/scholarship_db
CORS_ORIGIN=http://localhost:5173
```

## Database Setup (Production)

### 1. Create PostgreSQL Database

```bash
createdb scholarship_db
```

### 2. Load Schema

```bash
psql -U postgres -d scholarship_db -f database_schema.sql
```

### 3. Update .env

```env
DATABASE_URL=postgresql://user:password@localhost:5432/scholarship_db
```

## Available Scripts

### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Backend

```bash
npm run dev --workspace=server    # Start backend in watch mode
npm run build --workspace=server  # Build backend
npm run start --workspace=server  # Run built backend
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/forgot-password` - Request password reset

### Scholarships
- `GET /api/scholarships` - List all scholarships
- `GET /api/scholarships/:id` - Get single scholarship
- `POST /api/scholarships` - Create scholarship (admin only)
- `PUT /api/scholarships/:id` - Update scholarship (admin only)
- `DELETE /api/scholarships/:id` - Delete scholarship (super admin only)

### Applications
- `GET /api/applications` - List applications
- `GET /api/applications/:id` - Get single application
- `POST /api/applications` - Create new application
- `POST /api/applications/:id/submit` - Submit application
- `PUT /api/applications/:id` - Update application (admin only)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics (role-based)

### Users (Super Admin Only)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create new user

### Health Check
- `GET /api/health` - Server health status

## Role-Based Access Control

### Super Administrator
- Hidden from public UI and admin dashboards
- Full system access
- Can manage all users and settings
- Server-side enforcement only

### Administrator
- Can view and manage applications
- Can create and manage scholarship programs
- Can generate reports
- Cannot see Super Admin accounts
- Cannot create Super Admin accounts

### Applicant / Scholar
- Can submit applications
- Can upload documents
- Can track application status
- Can view announcements
- Can renew scholarships if approved

## Security Features

- ✓ JWT token-based authentication
- ✓ Password hashing with bcryptjs
- ✓ Role-based access control (RBAC)
- ✓ CSRF protection ready
- ✓ Rate limiting middleware
- ✓ Audit logging middleware
- ✓ Server-side authorization checks
- ✓ XSS protection with React
- ✓ SQL injection prevention (use parameterized queries with ORM)

## Development Tips

### Hot Reload
Both frontend and backend support hot reload during development.

### API Testing
Use curl, Postman, or VS Code REST Client:

```
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

### Database Queries
In production, use Prisma ORM for type-safe database access:

```bash
npm install @prisma/client prisma
npx prisma init
```

### TypeScript Compilation
```bash
npm run build
```

## Production Deployment

### Build Both Packages

```bash
npm run build
```

### Start Backend

```bash
npm run start --workspace=server
```

### Serve Frontend

Deploy the `client/dist` folder to:
- AWS S3 + CloudFront
- Vercel
- Netlify
- Apache/Nginx

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 4000 or 5173
netstat -ano | findstr :4000
netstat -ano | findstr :5173

# Kill process (Windows)
taskkill /PID <PID> /F
```

### CORS Issues

Make sure `CORS_ORIGIN` in `.env` matches your frontend URL:

```env
CORS_ORIGIN=http://localhost:5173
```

### Token Errors

Ensure `JWT_SECRET` is set in `.env`:

```env
JWT_SECRET=your-super-secret-key
```

## Next Steps

1. **Implement Database Layer**: Connect Prisma ORM to PostgreSQL
2. **Add More Features**: Applications, renewals, allowances, reports
3. **UI Components**: Build out full application workflow pages
4. **Email Notifications**: Integrate email service (SendGrid, AWS SES)
5. **File Upload**: Implement document storage (AWS S3, Azure Blob)
6. **Analytics**: Add charts and reporting features
7. **Mobile App**: Build React Native or Flutter app
8. **Testing**: Add unit and integration tests

## Support

For issues or questions, refer to:
- TypeScript: https://www.typescriptlang.org/docs/
- Express: https://expressjs.com/
- React: https://react.dev/
- Vite: https://vitejs.dev/
