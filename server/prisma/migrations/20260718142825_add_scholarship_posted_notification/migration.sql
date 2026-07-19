-- Add a dedicated notification type for "new scholarship program posted"
-- broadcasts, distinct from the generic announcement_posted type.
ALTER TYPE "NotificationType" ADD VALUE 'scholarship_posted';
