-- Corrige BD onde rename bakery→loja correu sem a migração de IVA (falta productDisplayLayout, vat_rates, vatRateId).

DO $$ BEGIN
  CREATE TYPE "ProductDisplayLayout" AS ENUM ('LARGE', 'MEDIUM', 'SMALL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- lojas: layout de produtos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lojas'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'lojas' AND column_name = 'product_display_layout'
    ) THEN
      ALTER TABLE "lojas" RENAME COLUMN "product_display_layout" TO "productDisplayLayout";
    END IF;
    ALTER TABLE "lojas"
      ADD COLUMN IF NOT EXISTS "productDisplayLayout" "ProductDisplayLayout" NOT NULL DEFAULT 'LARGE';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bakeries'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bakeries' AND column_name = 'product_display_layout'
    ) THEN
      ALTER TABLE "bakeries" RENAME COLUMN "product_display_layout" TO "productDisplayLayout";
    END IF;
    ALTER TABLE "bakeries"
      ADD COLUMN IF NOT EXISTS "productDisplayLayout" "ProductDisplayLayout" NOT NULL DEFAULT 'LARGE';
  END IF;
END $$;

-- vat_rates
CREATE TABLE IF NOT EXISTS "vat_rates" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ratePercent" DECIMAL(5,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vat_rates_pkey" PRIMARY KEY ("id")
);

-- Normalizar coluna lojaId em vat_rates (legado bakeryId / bakery_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vat_rates') THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vat_rates' AND column_name = 'bakery_id') THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "bakery_id" TO "lojaId";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vat_rates' AND column_name = 'bakeryId') THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "bakeryId" TO "lojaId";
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

CREATE INDEX IF NOT EXISTS "vat_rates_lojaId_idx" ON "vat_rates"("lojaId");

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lojas') THEN
    ALTER TABLE "vat_rates" DROP CONSTRAINT IF EXISTS "vat_rates_bakeryId_fkey";
    ALTER TABLE "vat_rates" DROP CONSTRAINT IF EXISTS "vat_rates_bakery_id_fkey";
    ALTER TABLE "vat_rates" DROP CONSTRAINT IF EXISTS "vat_rates_lojaId_fkey";
    ALTER TABLE "vat_rates"
      ADD CONSTRAINT "vat_rates_lojaId_fkey"
      FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bakeries') THEN
    ALTER TABLE "vat_rates" DROP CONSTRAINT IF EXISTS "vat_rates_bakeryId_fkey";
    ALTER TABLE "vat_rates"
      ADD CONSTRAINT "vat_rates_lojaId_fkey"
      FOREIGN KEY ("lojaId") REFERENCES "bakeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Escalões de IVA por loja
DO $$
DECLARE
  loja RECORD;
  vat_reduced TEXT;
  vat_inter TEXT;
  vat_normal TEXT;
  loja_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lojas') THEN
    loja_table := 'lojas';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bakeries') THEN
    loja_table := 'bakeries';
  ELSE
    RETURN;
  END IF;

  FOR loja IN EXECUTE format('SELECT id FROM %I', loja_table) LOOP
    IF EXISTS (SELECT 1 FROM "vat_rates" WHERE "lojaId" = loja.id LIMIT 1) THEN
      CONTINUE;
    END IF;
    vat_reduced := gen_random_uuid()::text;
    vat_inter := gen_random_uuid()::text;
    vat_normal := gen_random_uuid()::text;
    INSERT INTO "vat_rates" ("id", "lojaId", "label", "ratePercent", "sortOrder")
    VALUES
      (vat_reduced, loja.id, 'Reduzida', 6, 0),
      (vat_inter, loja.id, 'Intermédia', 13, 1),
      (vat_normal, loja.id, 'Normal', 23, 2);
  END LOOP;
END $$;

-- products.vatRateId
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
  WHERE v."lojaId" = p."lojaId" AND v."label" = 'Normal'
  LIMIT 1
)
WHERE p."vatRateId" IS NULL
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vat_rates');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'vatRateId' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "products" ALTER COLUMN "vatRateId" SET NOT NULL;
  END IF;
END $$;

ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_vat_rate_id_fkey";
DO $$ BEGIN
  ALTER TABLE "products"
    ADD CONSTRAINT "products_vatRateId_fkey"
    FOREIGN KEY ("vatRateId") REFERENCES "vat_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
