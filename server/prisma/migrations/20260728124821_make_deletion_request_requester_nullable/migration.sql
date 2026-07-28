-- Deleting a user whose account previously requested (or reviewed) a
-- DeletionRequest was blocked by the deletion_requests_requested_by_fkey
-- foreign key constraint, since requested_by was NOT NULL. Relaxing it
-- lets AuthService.performUserDeletion detach the reference (set it to
-- NULL) before deleting the user, the same way it already does for
-- audit_logs.user_id — the historical request record survives, just
-- without a live link to the now-deleted requester.
ALTER TABLE "deletion_requests" ALTER COLUMN "requested_by" DROP NOT NULL;
