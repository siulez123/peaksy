-- CreateEnum
CREATE TYPE "AnalyticsEventKind" AS ENUM ('PAGE_VIEW', 'EMBED_LAND');

-- CreateEnum
CREATE TYPE "AnalyticsPage" AS ENUM (
  'APEX_HOME',
  'SHOP',
  'SHOP_SUCCESS',
  'SHOP_CANCEL',
  'PICK_SLUG',
  'ADMIN_LOGIN',
  'ADMIN_DASHBOARD',
  'SUPER_LOGIN',
  'SUPER_DASHBOARD',
  'NOT_FOUND',
  'OTHER'
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "kind" "AnalyticsEventKind" NOT NULL,
    "page" "AnalyticsPage" NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "bakeryId" TEXT,
    "embedKey" VARCHAR(32),
    "referrer" VARCHAR(500),
    "sessionId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_bakeryId_createdAt_idx" ON "analytics_events"("bakeryId", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_page_createdAt_idx" ON "analytics_events"("page", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_embedKey_createdAt_idx" ON "analytics_events"("embedKey", "createdAt");

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "bakeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
