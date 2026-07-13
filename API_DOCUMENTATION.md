# Scholarship Management System - API Documentation

## Base URL

```
http://localhost:4000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* endpoint data */ },
  "message": "Operation completed"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Authentication

#### Login
```
POST /auth/login
```

Request:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "email": "admin@example.com",
    "firstName": "John",
    "lastName": "Admin",
    "role": "admin",
    "status": "active"
  },
  "expiresIn": 28800
}
```

#### Register
```
POST /auth/register
```

Request:
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Applicant"
}
```

Response:
```json
{
  "id": 4,
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Applicant",
  "role": "applicant",
  "status": "active",
  "emailVerified": false,
  "createdAt": "2024-07-01T10:30:00Z",
  "updatedAt": "2024-07-01T10:30:00Z"
}
```

#### Get Current User
```
GET /auth/me
Authorization: Bearer <token>
```

Response:
```json
{
  "id": 2,
  "email": "admin@example.com",
  "firstName": "John",
  "lastName": "Admin",
  "role": "admin",
  "status": "active",
  "createdAt": "2024-01-15T08:00:00Z",
  "updatedAt": "2024-07-01T09:00:00Z",
  "lastLogin": "2024-07-01T09:00:00Z"
}
```

#### Forgot Password
```
POST /auth/forgot-password
```

Request:
```json
{
  "email": "admin@example.com"
}
```

Response:
```json
{
  "message": "Password reset link sent to email"
}
```

---

### Scholarship Programs

#### List Scholarships
```
GET /scholarships?page=1&pageSize=10
```

Query Parameters:
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 10)
- `status` (string): Filter by status (active, closed)

Response:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Merit Scholarship 2024-2025",
      "description": "For outstanding academic performers",
      "sponsor": "Department of Education",
      "benefits": "Full tuition + Php 10,000/month",
      "numberOfSlots": 50,
      "maxApplicants": 500,
      "eligibilityRequirements": "GPA >= 3.0",
      "openingDate": "2024-06-01",
      "closingDate": "2024-08-31",
      "academicYear": "2024-2025",
      "status": "active",
      "createdAt": "2024-05-01T08:00:00Z",
      "updatedAt": "2024-05-01T08:00:00Z"
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

#### Get Scholarship
```
GET /scholarships/:id
```

Response:
```json
{
  "id": 1,
  "name": "Merit Scholarship 2024-2025",
  "description": "For outstanding academic performers",
  "sponsor": "Department of Education",
  "benefits": "Full tuition + Php 10,000/month",
  "numberOfSlots": 50,
  "maxApplicants": 500,
  "eligibilityRequirements": "GPA >= 3.0, Filipino citizen",
  "openingDate": "2024-06-01",
  "closingDate": "2024-08-31",
  "academicYear": "2024-2025",
  "status": "active",
  "createdBy": 2,
  "createdAt": "2024-05-01T08:00:00Z",
  "updatedAt": "2024-05-01T08:00:00Z"
}
```

#### Create Scholarship (Admin)
```
POST /scholarships
Authorization: Bearer <admin_token>
```

Request:
```json
{
  "name": "Tech Innovation Scholarship",
  "description": "For computer science and IT students",
  "sponsor": "Tech Foundation",
  "benefits": "Php 50,000/semester + internship placement",
  "numberOfSlots": 25,
  "maxApplicants": 300,
  "eligibilityRequirements": "Enrolled in CS/IT course, GPA >= 2.75",
  "openingDate": "2024-08-01",
  "closingDate": "2024-10-31",
  "academicYear": "2024-2025",
  "requiredDocuments": [
    "Certificate of Enrollment",
    "Transcript",
    "School ID",
    "Income Certificate"
  ]
}
```

Response:
```json
{
  "id": 3,
  "name": "Tech Innovation Scholarship",
  "description": "For computer science and IT students",
  "sponsor": "Tech Foundation",
  "benefits": "Php 50,000/semester + internship placement",
  "numberOfSlots": 25,
  "maxApplicants": 300,
  "eligibilityRequirements": "Enrolled in CS/IT course, GPA >= 2.75",
  "openingDate": "2024-08-01",
  "closingDate": "2024-10-31",
  "academicYear": "2024-2025",
  "status": "active",
  "createdBy": 2,
  "createdAt": "2024-07-01T10:00:00Z",
  "updatedAt": "2024-07-01T10:00:00Z"
}
```

#### Update Scholarship (Admin)
```
PUT /scholarships/:id
Authorization: Bearer <admin_token>
```

Request:
```json
{
  "status": "closed",
  "numberOfSlots": 20
}
```

#### Delete Scholarship (Super Admin)
```
DELETE /scholarships/:id
Authorization: Bearer <superadmin_token>
```

Response:
```json
{
  "message": "Scholarship deleted successfully"
}
```

---

### Applications

#### List Applications
```
GET /applications?page=1&pageSize=10&status=submitted
Authorization: Bearer <token>
```

Query Parameters:
- `page`: Page number
- `pageSize`: Items per page
- `status`: Filter by status (draft, submitted, approved, rejected)
- `scholarshipId`: Filter by scholarship
- `dateFrom`: Start date (YYYY-MM-DD)
- `dateTo`: End date (YYYY-MM-DD)

Response:
```json
{
  "data": [
    {
      "id": 1,
      "applicantId": 3,
      "scholarshipId": 1,
      "status": "under_review",
      "submissionDate": "2024-07-01T10:30:00Z",
      "reviewedBy": null,
      "reviewedAt": null,
      "comments": null,
      "createdAt": "2024-07-01T10:00:00Z",
      "updatedAt": "2024-07-01T10:30:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 10,
  "totalPages": 2
}
```

#### Create Application
```
POST /applications
Authorization: Bearer <applicant_token>
```

Request:
```json
{
  "scholarshipId": 1
}
```

Response:
```json
{
  "id": 5,
  "applicantId": 3,
  "scholarshipId": 1,
  "status": "draft",
  "submissionDate": null,
  "reviewedBy": null,
  "createdAt": "2024-07-01T10:45:00Z",
  "updatedAt": "2024-07-01T10:45:00Z"
}
```

#### Submit Application
```
POST /applications/:id/submit
Authorization: Bearer <applicant_token>
```

Response:
```json
{
  "id": 5,
  "applicantId": 3,
  "scholarshipId": 1,
  "status": "submitted",
  "submissionDate": "2024-07-01T10:46:00Z",
  "createdAt": "2024-07-01T10:45:00Z",
  "updatedAt": "2024-07-01T10:46:00Z"
}
```

#### Update Application (Admin)
```
PUT /applications/:id
Authorization: Bearer <admin_token>
```

Request:
```json
{
  "status": "approved",
  "comments": "Excellent academic record and recommendations"
}
```

---

### Dashboard

#### Get Dashboard Stats
```
GET /dashboard/stats
Authorization: Bearer <token>
```

Response for Admin/Super Admin:
```json
{
  "totalScholars": 1248,
  "activeScholars": 1045,
  "graduatedScholars": 203,
  "pendingApplications": 84,
  "approvedApplications": 612,
  "rejectedApplications": 128,
  "scholarshipUtilization": 85,
  "renewalsDue": 37
}
```

Response for Applicant/Scholar:
```json
{
  "applicationStatus": "approved",
  "scholarshipName": "Merit Scholarship 2024-2025",
  "gpa": 3.45,
  "renewalStatus": "pending",
  "allowanceStatus": "released"
}
```

---

### Users (Super Admin Only)

#### List Users
```
GET /users
Authorization: Bearer <superadmin_token>
```

Note: Super Admin accounts are excluded from all non-Super Admin user lists.

#### Create User
```
POST /users
Authorization: Bearer <superadmin_token>
```

Request:
```json
{
  "email": "newadmin@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "NewAdmin",
  "role": "admin"
}
```

---

### Health Check

#### Server Health
```
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-07-01T10:50:00.000Z"
}
```

---

## Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized (missing or invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **429**: Too Many Requests (rate limited)
- **500**: Internal Server Error

---

## Rate Limiting

API endpoints are rate-limited to 100 requests per 15 minutes per IP address.

---

## Error Codes

- `INVALID_CREDENTIALS`: Email or password incorrect
- `USER_EXISTS`: User with this email already exists
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid request data
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## Date Format

All dates in requests and responses use ISO 8601 format:

```
2024-07-01T10:30:00.000Z
```

## Pagination

All list endpoints support pagination:

- `page`: Page number (1-indexed)
- `pageSize`: Number of items per page (default: 10, max: 100)

Response includes:
- `data`: Array of items
- `total`: Total number of items
- `page`: Current page
- `pageSize`: Items per page
- `totalPages`: Total number of pages

---

## Role-Based Permissions

### Super Administrator
- All endpoints (hidden from admin/applicant views)

### Administrator
- View/manage applications
- View/manage scholarship programs
- View statistics and reports
- Cannot view Super Admin accounts

### Applicant / Scholar
- Create and submit applications
- Upload documents
- View own applications
- View announcements
- Update own profile

---

## Example Requests

### Login as Admin

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### List Scholarships

```bash
curl http://localhost:4000/api/scholarships?page=1&pageSize=10
```

### Create Scholarship (as Admin)

```bash
curl -X POST http://localhost:4000/api/scholarships \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "New Scholarship",
    "description": "Description",
    "sponsor": "Sponsor Name",
    "benefits": "Benefits",
    "numberOfSlots": 50,
    "maxApplicants": 500,
    "eligibilityRequirements": "GPA >= 2.75",
    "openingDate": "2024-08-01",
    "closingDate": "2024-10-31",
    "academicYear": "2024-2025"
  }'
```
