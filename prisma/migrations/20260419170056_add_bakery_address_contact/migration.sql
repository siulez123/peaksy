-- AlterTable
ALTER TABLE "bakeries" ADD COLUMN     "addressLine" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "locality" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "postalCode" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "pickupTime" DROP DEFAULT;
