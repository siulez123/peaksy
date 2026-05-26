-- CreateEnum
CREATE TYPE "ShopColorPalette" AS ENUM ('INDIGO', 'TEAL', 'ROSE', 'AMBER');

-- AlterTable
ALTER TABLE "lojas" ADD COLUMN IF NOT EXISTS "colorPalette" "ShopColorPalette" NOT NULL DEFAULT 'INDIGO';
