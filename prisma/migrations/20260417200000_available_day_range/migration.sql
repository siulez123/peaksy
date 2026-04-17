-- AlterTable: período de levantamento (vários dias)
ALTER TABLE "available_days" ADD COLUMN "pickupEndDate" DATE;

UPDATE "available_days" SET "pickupEndDate" = "pickupDate" WHERE "pickupEndDate" IS NULL;

ALTER TABLE "available_days" ALTER COLUMN "pickupEndDate" SET NOT NULL;

DROP INDEX IF EXISTS "available_days_bakeryId_pickupDate_key";

CREATE INDEX "available_days_bakeryId_pickupDate_idx" ON "available_days"("bakeryId", "pickupDate");
