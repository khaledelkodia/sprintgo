-- Auto-offer dispatch: new assignment statuses + offer timestamps.
-- (enum values are added here; the index that USES them is a separate migration,
--  since Postgres forbids using a new enum value in the same transaction that adds it.)
ALTER TYPE "AssignmentStatus" ADD VALUE 'OFFERED';
ALTER TYPE "AssignmentStatus" ADD VALUE 'REJECTED';
ALTER TYPE "AssignmentStatus" ADD VALUE 'EXPIRED';

ALTER TABLE "delivery_assignments"
  ALTER COLUMN "assigned_by_id" DROP NOT NULL,
  ADD COLUMN "offered_at" TIMESTAMP(3),
  ADD COLUMN "expires_at" TIMESTAMP(3),
  ADD COLUMN "responded_at" TIMESTAMP(3);
