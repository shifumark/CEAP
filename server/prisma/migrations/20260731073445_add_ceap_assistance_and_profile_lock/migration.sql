-- VII. Other Educational Assistance — a dedicated yes/no + amount for
-- CEAP itself, distinct from the existing "any other program" question.
ALTER TABLE "applicants" ADD COLUMN "received_ceap_assistance" BOOLEAN;
ALTER TABLE "applicants" ADD COLUMN "ceap_assistance_amount" DECIMAL(12,2);

-- Profile edit lock: set true automatically once a student submits any
-- application; only an Admin/Super Admin can clear it.
ALTER TABLE "applicants" ADD COLUMN "profile_locked" BOOLEAN NOT NULL DEFAULT false;
