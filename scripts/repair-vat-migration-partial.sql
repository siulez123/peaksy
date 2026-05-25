-- Repara estado parcial da migração 20260525210000 (versão com snake_case).
-- Correr no Railway/psql DEPOIS de falha no UPDATE, ANTES de migrate resolve.
-- Uso: psql "$DATABASE_URL" -f scripts/repair-vat-migration-partial.sql

BEGIN;

-- bakeries: product_display_layout -> productDisplayLayout
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bakeries' AND column_name = 'product_display_layout'
  ) THEN
    ALTER TABLE "bakeries" RENAME COLUMN "product_display_layout" TO "productDisplayLayout";
  END IF;
END $$;

-- vat_rates: renomear colunas snake_case -> camelCase (Prisma)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vat_rates' AND column_name = 'bakery_id'
  ) THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "bakery_id" TO "bakeryId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vat_rates' AND column_name = 'rate_percent'
  ) THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "rate_percent" TO "ratePercent";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vat_rates' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "sort_order" TO "sortOrder";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vat_rates' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "created_at" TO "createdAt";
  END IF;
END $$;

-- Índice / FK antigos (nomes da migração incorreta)
DROP INDEX IF EXISTS "vat_rates_bakery_id_idx";
CREATE INDEX IF NOT EXISTS "vat_rates_bakeryId_idx" ON "vat_rates"("bakeryId");

ALTER TABLE "vat_rates" DROP CONSTRAINT IF EXISTS "vat_rates_bakery_id_fkey";
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vat_rates_bakeryId_fkey'
  ) THEN
    ALTER TABLE "vat_rates"
      ADD CONSTRAINT "vat_rates_bakeryId_fkey"
      FOREIGN KEY ("bakeryId") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- products: vat_rate_id -> vatRateId
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'vat_rate_id'
  ) THEN
    ALTER TABLE "products" RENAME COLUMN "vat_rate_id" TO "vatRateId";
  END IF;
END $$;

-- Coluna ainda não criada (falha antes do ALTER)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "vatRateId" TEXT;

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
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_vatRateId_fkey'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_vatRateId_fkey"
      FOREIGN KEY ("vatRateId") REFERENCES "vat_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
