-- CreateEnum
CREATE TYPE "ProductDisplayLayout" AS ENUM ('LARGE', 'MEDIUM', 'SMALL');

-- AlterTable
ALTER TABLE "bakeries" ADD COLUMN "productDisplayLayout" "ProductDisplayLayout" NOT NULL DEFAULT 'LARGE';

-- CreateTable
CREATE TABLE "vat_rates" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ratePercent" DECIMAL(5,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vat_rates_bakeryId_idx" ON "vat_rates"("bakeryId");

-- AddForeignKey
ALTER TABLE "vat_rates" ADD CONSTRAINT "vat_rates_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Escalões padrão e associação aos produtos existentes
DO $$
DECLARE
  loja RECORD;
  vat_reduced TEXT;
  vat_inter TEXT;
  vat_normal TEXT;
BEGIN
  FOR loja IN SELECT id FROM bakeries LOOP
    vat_reduced := gen_random_uuid()::text;
    vat_inter := gen_random_uuid()::text;
    vat_normal := gen_random_uuid()::text;
    INSERT INTO "vat_rates" ("id", "bakeryId", "label", "ratePercent", "sortOrder")
    VALUES
      (vat_reduced, loja.id, 'Reduzida', 6, 0),
      (vat_inter, loja.id, 'Intermédia', 13, 1),
      (vat_normal, loja.id, 'Normal', 23, 2);
  END LOOP;
END $$;

ALTER TABLE "products" ADD COLUMN "vatRateId" TEXT;

UPDATE "products" p
SET "vatRateId" = (
  SELECT v.id FROM "vat_rates" v
  WHERE v."bakeryId" = p."bakeryId" AND v."label" = 'Normal'
  LIMIT 1
);

ALTER TABLE "products" ALTER COLUMN "vatRateId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_vatRateId_fkey" FOREIGN KEY ("vatRateId") REFERENCES "vat_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
