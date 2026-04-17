-- Janela de levantamento (admin) e hora escolhida pelo cliente (pedido)
ALTER TABLE "available_days" ADD COLUMN IF NOT EXISTS "pickupTimeMin" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "available_days" ADD COLUMN IF NOT EXISTS "pickupTimeMax" TEXT NOT NULL DEFAULT '20:00';

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickupTime" TEXT NOT NULL DEFAULT '12:00';
