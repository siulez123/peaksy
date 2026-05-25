-- CreateEnum
CREATE TYPE "ProductDisplayLayout" AS ENUM ('LARGE', 'MEDIUM', 'SMALL');

-- AlterTable
ALTER TABLE "bakeries" ADD COLUMN "product_display_layout" "ProductDisplayLayout" NOT NULL DEFAULT 'LARGE';

-- CreateTable
CREATE TABLE "vat_rates" (
    "id" TEXT NOT NULL,
    "bakery_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rate_percent" DECIMAL(5,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vat_rates_bakery_id_idx" ON "vat_rates"("bakery_id");

-- AddForeignKey
ALTER TABLE "vat_rates" ADD CONSTRAINT "vat_rates_bakery_id_fkey" FOREIGN KEY ("bakery_id") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
    INSERT INTO "vat_rates" ("id", "bakery_id", "label", "rate_percent", "sort_order")
    VALUES
      (vat_reduced, loja.id, 'Reduzida', 6, 0),
      (vat_inter, loja.id, 'Intermédia', 13, 1),
      (vat_normal, loja.id, 'Normal', 23, 2);
  END LOOP;
END $$;

ALTER TABLE "products" ADD COLUMN "vat_rate_id" TEXT;

UPDATE "products" p
SET "vat_rate_id" = (
  SELECT v.id FROM "vat_rates" v
  WHERE v."bakery_id" = p."bakery_id" AND v."label" = 'Normal'
  LIMIT 1
);

ALTER TABLE "products" ALTER COLUMN "vat_rate_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_vat_rate_id_fkey" FOREIGN KEY ("vat_rate_id") REFERENCES "vat_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
