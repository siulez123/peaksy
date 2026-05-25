-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('ONLINE', 'IN_STORE');

-- AlterTable
ALTER TABLE "bakeries" ADD COLUMN "allowOnlinePayment" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "bakeries" ADD COLUMN "allowInStorePayment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paymentMethod" "OrderPaymentMethod" NOT NULL DEFAULT 'ONLINE';
