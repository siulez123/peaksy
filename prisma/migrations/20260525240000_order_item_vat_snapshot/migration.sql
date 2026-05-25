ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "vatRatePercentSnapshot" DECIMAL(5,2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "vatRateLabelSnapshot" TEXT;

UPDATE "order_items" oi
SET
  "vatRatePercentSnapshot" = v."ratePercent",
  "vatRateLabelSnapshot" = v."label"
FROM "products" p
JOIN "vat_rates" v ON v."id" = p."vatRateId"
WHERE oi."productId" = p."id"
  AND oi."vatRatePercentSnapshot" IS NULL;

UPDATE "order_items"
SET
  "vatRatePercentSnapshot" = 23,
  "vatRateLabelSnapshot" = 'Normal'
WHERE "vatRatePercentSnapshot" IS NULL;

ALTER TABLE "order_items" ALTER COLUMN "vatRatePercentSnapshot" SET NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "vatRateLabelSnapshot" SET NOT NULL;
