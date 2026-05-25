-- Renomeia legado bakery/padaria → loja na base de dados (tabelas, colunas, índices, FKs, enum).
-- Normaliza antes colunas da migração de IVA que possam ter ficado em snake_case.

-- bakeries: coluna de layout (versão incorreta da migração de IVA)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bakeries' AND column_name = 'product_display_layout'
  ) THEN
    ALTER TABLE "bakeries" RENAME COLUMN "product_display_layout" TO "productDisplayLayout";
  END IF;
END $$;

-- vat_rates: snake_case → camelCase (antes do rename global)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vat_rates') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vat_rates' AND column_name = 'bakery_id'
    ) THEN
      ALTER TABLE "vat_rates" RENAME COLUMN "bakery_id" TO "bakeryId";
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vat_rates' AND column_name = 'rate_percent'
    ) THEN
      ALTER TABLE "vat_rates" RENAME COLUMN "rate_percent" TO "ratePercent";
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vat_rates' AND column_name = 'sort_order'
    ) THEN
      ALTER TABLE "vat_rates" RENAME COLUMN "sort_order" TO "sortOrder";
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vat_rates' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE "vat_rates" RENAME COLUMN "created_at" TO "createdAt";
    END IF;
  END IF;
END $$;

-- products: vat_rate_id → vatRateId e preenchimento se a migração de IVA ficou a meio
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'vat_rate_id'
  ) THEN
    ALTER TABLE "products" RENAME COLUMN "vat_rate_id" TO "vatRateId";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vat_rates')
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'vatRateId'
     ) THEN
    UPDATE "products" p
    SET "vatRateId" = (
      SELECT v.id FROM "vat_rates" v
      WHERE v."bakeryId" = p."bakeryId" AND v."label" = 'Normal'
      LIMIT 1
    )
    WHERE p."vatRateId" IS NULL;

    ALTER TABLE "products" ALTER COLUMN "vatRateId" SET NOT NULL;

    ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_vat_rate_id_fkey";
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_vatRateId_fkey') THEN
      ALTER TABLE "products"
        ADD CONSTRAINT "products_vatRateId_fkey"
        FOREIGN KEY ("vatRateId") REFERENCES "vat_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

-- Enum UserRole: BAKERY_ADMIN → LOJA_ADMIN
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'BAKERY_ADMIN'
  ) THEN
    ALTER TYPE "UserRole" RENAME VALUE 'BAKERY_ADMIN' TO 'LOJA_ADMIN';
  END IF;
END $$;

-- Tabela principal
ALTER TABLE "bakeries" RENAME TO "lojas";

-- Colunas bakeryId → lojaId
ALTER TABLE "users" RENAME COLUMN "bakeryId" TO "lojaId";
ALTER TABLE "products" RENAME COLUMN "bakeryId" TO "lojaId";
ALTER TABLE "available_days" RENAME COLUMN "bakeryId" TO "lojaId";
ALTER TABLE "available_day_product_caps" RENAME COLUMN "bakeryId" TO "lojaId";
ALTER TABLE "available_day_pickup_dates" RENAME COLUMN "bakeryId" TO "lojaId";
ALTER TABLE "orders" RENAME COLUMN "bakeryId" TO "lojaId";
ALTER TABLE "analytics_events" RENAME COLUMN "bakeryId" TO "lojaId";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vat_rates' AND column_name = 'bakeryId'
  ) THEN
    ALTER TABLE "vat_rates" RENAME COLUMN "bakeryId" TO "lojaId";
  END IF;
END $$;

-- Foreign keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_bakeryId_fkey') THEN
    ALTER TABLE "users" RENAME CONSTRAINT "users_bakeryId_fkey" TO "users_lojaId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_bakeryId_fkey') THEN
    ALTER TABLE "products" RENAME CONSTRAINT "products_bakeryId_fkey" TO "products_lojaId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'available_days_bakeryId_fkey') THEN
    ALTER TABLE "available_days" RENAME CONSTRAINT "available_days_bakeryId_fkey" TO "available_days_lojaId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'available_day_product_caps_bakeryId_fkey') THEN
    ALTER TABLE "available_day_product_caps" RENAME CONSTRAINT "available_day_product_caps_bakeryId_fkey" TO "available_day_product_caps_lojaId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'available_day_pickup_dates_bakeryId_fkey') THEN
    ALTER TABLE "available_day_pickup_dates" RENAME CONSTRAINT "available_day_pickup_dates_bakeryId_fkey" TO "available_day_pickup_dates_lojaId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_bakeryId_fkey') THEN
    ALTER TABLE "orders" RENAME CONSTRAINT "orders_bakeryId_fkey" TO "orders_lojaId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_events_bakeryId_fkey') THEN
    ALTER TABLE "analytics_events" RENAME CONSTRAINT "analytics_events_bakeryId_fkey" TO "analytics_events_lojaId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vat_rates_bakeryId_fkey') THEN
    ALTER TABLE "vat_rates" RENAME CONSTRAINT "vat_rates_bakeryId_fkey" TO "vat_rates_lojaId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vat_rates_bakery_id_fkey') THEN
    ALTER TABLE "vat_rates" RENAME CONSTRAINT "vat_rates_bakery_id_fkey" TO "vat_rates_lojaId_fkey";
  END IF;
END $$;

-- Índices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bakeries_slug_key') THEN
    ALTER INDEX "bakeries_slug_key" RENAME TO "lojas_slug_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bakeries_domain_key') THEN
    ALTER INDEX "bakeries_domain_key" RENAME TO "lojas_domain_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'available_days_bakeryId_pickupDate_idx') THEN
    ALTER INDEX "available_days_bakeryId_pickupDate_idx" RENAME TO "available_days_lojaId_pickupDate_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'available_day_pickup_dates_bakeryId_pickupDate_idx') THEN
    ALTER INDEX "available_day_pickup_dates_bakeryId_pickupDate_idx" RENAME TO "available_day_pickup_dates_lojaId_pickupDate_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'analytics_events_bakeryId_createdAt_idx') THEN
    ALTER INDEX "analytics_events_bakeryId_createdAt_idx" RENAME TO "analytics_events_lojaId_createdAt_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'vat_rates_bakeryId_idx') THEN
    ALTER INDEX "vat_rates_bakeryId_idx" RENAME TO "vat_rates_lojaId_idx";
  ELSIF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'vat_rates_bakery_id_idx') THEN
    ALTER INDEX "vat_rates_bakery_id_idx" RENAME TO "vat_rates_lojaId_idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vat_rates') THEN
    CREATE INDEX IF NOT EXISTS "vat_rates_lojaId_idx" ON "vat_rates"("lojaId");
  END IF;
END $$;
