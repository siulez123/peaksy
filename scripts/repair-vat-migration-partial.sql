-- Só usar se a migração de IVA ficou A MEIO (tabela vat_rates já existe com colunas erradas).
-- NÃO uses `npx prisma db execute` — o Prisma exige que vat_rates exista no schema/BD (P1014).
-- Corre com psql:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/repair-vat-migration-partial.sql
--
-- Se vat_rates NÃO existe, ignora este ficheiro e corre:
--   npx prisma migrate resolve --rolled-back 20260525210000_vat_and_product_layout
--   npx prisma migrate deploy

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'vat_rates'
  ) THEN
    RAISE EXCEPTION 'Tabela vat_rates não existe — usa migrate resolve + migrate deploy em vez deste script.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bakeries' AND column_name = 'product_display_layout'
  ) THEN
    ALTER TABLE "bakeries" RENAME COLUMN "product_display_layout" TO "productDisplayLayout";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vat_rates' AND column_name = 'bakery_id') THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "bakery_id" TO "bakeryId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vat_rates' AND column_name = 'rate_percent') THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "rate_percent" TO "ratePercent";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vat_rates' AND column_name = 'sort_order') THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "sort_order" TO "sortOrder";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vat_rates' AND column_name = 'created_at') THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "created_at" TO "createdAt";
  END IF;
END $$;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "vatRateId" TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'vat_rate_id') THEN
    ALTER TABLE "products" RENAME COLUMN "vat_rate_id" TO "vatRateId";
  END IF;
END $$;

UPDATE "products" p
SET "vatRateId" = (
  SELECT v.id FROM "vat_rates" v
  WHERE v."bakeryId" = p."bakeryId" AND v."label" = 'Normal'
  LIMIT 1
)
WHERE p."vatRateId" IS NULL;

ALTER TABLE "products" ALTER COLUMN "vatRateId" SET NOT NULL;

ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_vat_rate_id_fkey";
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_vatRateId_fkey') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_vatRateId_fkey"
      FOREIGN KEY ("vatRateId") REFERENCES "vat_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
