-- Production-readiness review: the schema had zero indexes beyond
-- primary keys and pre-existing unique constraints, meaning every
-- foreign-key/status/yearLevel filter across the app's listing, report,
-- and dashboard-stat queries was a sequential scan. Fine at today's row
-- counts, but degrades as applications/documents/scholars grow.
--
-- Also adds a uniqueness guarantee on (applicant_id, scholarship_id) for
-- applications — closes a check-then-create race in
-- ApplicationService.createApplication where two concurrent submits
-- could otherwise both pass the "no existing application" check before
-- either had committed. Verified no existing duplicate rows before this
-- migration was written.
CREATE UNIQUE INDEX "applications_applicant_id_scholarship_id_key" ON "applications"("applicant_id", "scholarship_id");
CREATE INDEX "applications_scholarship_id_idx" ON "applications"("scholarship_id");
CREATE INDEX "applications_status_idx" ON "applications"("status");

CREATE INDEX "application_status_history_application_id_idx" ON "application_status_history"("application_id");

CREATE INDEX "uploaded_documents_application_id_idx" ON "uploaded_documents"("application_id");
CREATE INDEX "uploaded_documents_user_id_idx" ON "uploaded_documents"("user_id");

CREATE INDEX "scholars_scholarship_id_idx" ON "scholars"("scholarship_id");
CREATE INDEX "scholars_status_idx" ON "scholars"("status");

CREATE INDEX "grades_scholar_id_idx" ON "grades"("scholar_id");

CREATE INDEX "renewals_scholar_id_idx" ON "renewals"("scholar_id");
CREATE INDEX "renewals_status_idx" ON "renewals"("status");

CREATE INDEX "allowances_scholar_id_idx" ON "allowances"("scholar_id");

CREATE INDEX "violations_scholar_id_idx" ON "violations"("scholar_id");

CREATE INDEX "announcement_attachments_announcement_id_idx" ON "announcement_attachments"("announcement_id");

CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

CREATE INDEX "deletion_requests_status_idx" ON "deletion_requests"("status");

CREATE INDEX "scholarship_programs_status_idx" ON "scholarship_programs"("status");

CREATE INDEX "applicants_year_level_idx" ON "applicants"("year_level");

CREATE INDEX "educational_records_applicant_id_idx" ON "educational_records"("applicant_id");

CREATE INDEX "required_documents_scholarship_id_idx" ON "required_documents"("scholarship_id");
