-- CreateEnum
CREATE TYPE "DeletionEntityType" AS ENUM ('application', 'scholar', 'user');

-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "deletion_requests" (
    "id" SERIAL NOT NULL,
    "entity_type" "DeletionEntityType" NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "entity_label" TEXT NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,

    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
