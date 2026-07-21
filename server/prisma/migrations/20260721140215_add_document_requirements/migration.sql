-- CreateTable
CREATE TABLE "document_requirements" (
    "id" SERIAL NOT NULL,
    "document_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_requirements_document_type_key" ON "document_requirements"("document_type");

-- Seed the document types that were previously hardcoded in
-- REQUIRED_PROFILE_DOCUMENT_TYPES, so existing applicant profile
-- completeness checks behave identically after this migration.
INSERT INTO "document_requirements" ("document_type", "updated_at") VALUES
    ('Valid ID', CURRENT_TIMESTAMP),
    ('Certificate of Indigency', CURRENT_TIMESTAMP),
    ('Voters Certificate', CURRENT_TIMESTAMP),
    ('Enrolment Form', CURRENT_TIMESTAMP),
    ('Grades', CURRENT_TIMESTAMP),
    ('Real Property Tax Receipt / Certificate of No Land Holding', CURRENT_TIMESTAMP),
    ('Application Form', CURRENT_TIMESTAMP),
    ('LBP ATM Card Photocopy', CURRENT_TIMESTAMP);
