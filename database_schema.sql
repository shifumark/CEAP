-- Scholarship Management System Database Schema
-- PostgreSQL

-- ROLES AND PERMISSIONS
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, description) VALUES
('super_admin', 'Super Administrator with full system access'),
('admin', 'Administrator with scholarship program and application management'),
('applicant', 'Scholarship applicant and scholar'),
('guest', 'Guest user without authentication');

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

-- USERS
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  status VARCHAR(20) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  profile_picture_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_status ON users(status);

-- APPLICANT / SCHOLAR PROFILES
CREATE TABLE applicants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  middle_name VARCHAR(100),
  suffix VARCHAR(20),
  date_of_birth DATE,
  age INTEGER GENERATED ALWAYS AS (DATE_PART('year', AGE(date_of_birth))) STORED,
  sex VARCHAR(20),
  civil_status VARCHAR(50),
  contact_number VARCHAR(20),
  address TEXT,
  municipality VARCHAR(100),
  barangay VARCHAR(100),
  zip_code VARCHAR(10),
  household_monthly_income DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_applicants_user_id ON applicants(user_id);

-- FAMILY INFORMATION
CREATE TABLE family_members (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  relationship VARCHAR(50),
  occupation VARCHAR(100),
  contact_number VARCHAR(20),
  member_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_family_members_applicant_id ON family_members(applicant_id);

-- EMERGENCY CONTACT
CREATE TABLE emergency_contacts (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL UNIQUE REFERENCES applicants(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  relationship VARCHAR(50),
  contact_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SCHOOLS AND COURSES
CREATE TABLE schools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_school_id ON courses(school_id);

-- EDUCATIONAL INFORMATION
CREATE TABLE educational_records (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id),
  student_id VARCHAR(50),
  course_id INTEGER REFERENCES courses(id),
  year_level VARCHAR(50),
  semester VARCHAR(50),
  gpa DECIMAL(5, 2),
  enrollment_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_educational_records_applicant_id ON educational_records(applicant_id);

-- SCHOLARSHIP PROGRAMS
CREATE TABLE scholarship_programs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sponsor VARCHAR(255),
  benefits TEXT,
  number_of_slots INTEGER,
  max_applicants INTEGER,
  eligibility_requirements TEXT,
  opening_date DATE,
  closing_date DATE,
  academic_year VARCHAR(20),
  status VARCHAR(50) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scholarship_programs_status ON scholarship_programs(status);
CREATE INDEX idx_scholarship_programs_closing_date ON scholarship_programs(closing_date);

-- REQUIRED DOCUMENTS
CREATE TABLE required_documents (
  id SERIAL PRIMARY KEY,
  scholarship_id INTEGER NOT NULL REFERENCES scholarship_programs(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_required_documents_scholarship_id ON required_documents(scholarship_id);

-- APPLICATIONS
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  scholarship_id INTEGER NOT NULL REFERENCES scholarship_programs(id),
  status VARCHAR(50) DEFAULT 'draft',
  submission_date TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX idx_applications_scholarship_id ON applications(scholarship_id);
CREATE INDEX idx_applications_status ON applications(status);

-- APPLICATION STATUS HISTORY
CREATE TABLE application_status_history (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_status_history_application_id ON application_status_history(application_id);

-- UPLOADED DOCUMENTS
CREATE TABLE uploaded_documents (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  document_type VARCHAR(100),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  verification_status VARCHAR(50) DEFAULT 'pending',
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  verification_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_uploaded_documents_application_id ON uploaded_documents(application_id);
CREATE INDEX idx_uploaded_documents_user_id ON uploaded_documents(user_id);
CREATE INDEX idx_uploaded_documents_verification_status ON uploaded_documents(verification_status);

-- SCHOLARS (APPROVED APPLICANTS)
CREATE TABLE scholars (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  scholarship_id INTEGER NOT NULL REFERENCES scholarship_programs(id),
  scholar_id_number VARCHAR(50) UNIQUE,
  approval_date DATE,
  qr_code TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scholars_user_id ON scholars(user_id);
CREATE INDEX idx_scholars_scholarship_id ON scholars(scholarship_id);
CREATE INDEX idx_scholars_status ON scholars(status);

-- GRADES
CREATE TABLE grades (
  id SERIAL PRIMARY KEY,
  scholar_id INTEGER NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  academic_year VARCHAR(20),
  semester VARCHAR(50),
  gpa DECIMAL(5, 2),
  subject_details JSONB,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grades_scholar_id ON grades(scholar_id);

-- RENEWALS
CREATE TABLE renewals (
  id SERIAL PRIMARY KEY,
  scholar_id INTEGER NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  academic_year VARCHAR(20),
  semester VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  submission_date TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  decision VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_renewals_scholar_id ON renewals(scholar_id);
CREATE INDEX idx_renewals_status ON renewals(status);

-- ALLOWANCES
CREATE TABLE allowances (
  id SERIAL PRIMARY KEY,
  scholar_id INTEGER NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  academic_year VARCHAR(20),
  semester VARCHAR(50),
  amount DECIMAL(12, 2),
  payment_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  release_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_allowances_scholar_id ON allowances(scholar_id);
CREATE INDEX idx_allowances_status ON allowances(status);

-- VIOLATIONS / COMPLIANCE
CREATE TABLE violations (
  id SERIAL PRIMARY KEY,
  scholar_id INTEGER NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  violation_type VARCHAR(100),
  description TEXT,
  severity VARCHAR(50),
  action_taken VARCHAR(100),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_date TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_violations_scholar_id ON violations(scholar_id);

-- ANNOUNCEMENTS
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(50),
  pinned BOOLEAN DEFAULT FALSE,
  pinned_until TIMESTAMP,
  created_by INTEGER NOT NULL REFERENCES users(id),
  published_at TIMESTAMP,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcements_published_at ON announcements(published_at);
CREATE INDEX idx_announcements_pinned ON announcements(pinned);

-- ANNOUNCEMENT ATTACHMENTS
CREATE TABLE announcement_attachments (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  file_path TEXT,
  file_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT,
  notification_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  action_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- AUDIT LOGS
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- LOGIN HISTORY
CREATE TABLE login_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_timestamp TIMESTAMP,
  ip_address VARCHAR(50),
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success'
);

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_login_timestamp ON login_history(login_timestamp);

-- SYSTEM SETTINGS
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOCUMENT VERIFICATION CHECKLIST
CREATE TABLE document_verification_checklist (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES required_documents(id),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doc_verification_checklist_application_id ON document_verification_checklist(application_id);
