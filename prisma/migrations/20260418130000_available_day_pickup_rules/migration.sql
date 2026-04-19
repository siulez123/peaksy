-- CreateTable
CREATE TABLE "available_day_pickup_dates" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "availableDayId" TEXT NOT NULL,
    "pickupDate" DATE NOT NULL,
    "orderDeadline" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "available_day_pickup_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "available_day_pickup_dates_availableDayId_pickupDate_key" ON "available_day_pickup_dates"("availableDayId", "pickupDate");

-- CreateIndex
CREATE INDEX "available_day_pickup_dates_bakeryId_pickupDate_idx" ON "available_day_pickup_dates"("bakeryId", "pickupDate");

-- AddForeignKey
ALTER TABLE "available_day_pickup_dates" ADD CONSTRAINT "available_day_pickup_dates_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "available_day_pickup_dates" ADD CONSTRAINT "available_day_pickup_dates_availableDayId_fkey" FOREIGN KEY ("availableDayId") REFERENCES "available_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Uma linha por dia civil entre pickupDate e pickupEndDate (comportamento anterior)
INSERT INTO "available_day_pickup_dates" ("id", "bakeryId", "availableDayId", "pickupDate", "orderDeadline")
SELECT
  gen_random_uuid()::text,
  ad."bakeryId",
  ad."id",
  d::date,
  ad."orderDeadline"
FROM "available_days" ad
CROSS JOIN LATERAL generate_series(
  ad."pickupDate"::timestamp,
  ad."pickupEndDate"::timestamp,
  interval '1 day'
) AS d;

-- AlterTable
ALTER TABLE "available_days" ADD COLUMN "ordersOpenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "available_days" DROP COLUMN "orderDeadline";
