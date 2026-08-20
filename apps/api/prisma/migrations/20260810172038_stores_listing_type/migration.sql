-- CreateEnum
CREATE TYPE "StoreListingType" AS ENUM ('PICKUP_POINT', 'CATALOG');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "listing_type" "StoreListingType" NOT NULL DEFAULT 'CATALOG',
ADD COLUMN     "manager_permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
