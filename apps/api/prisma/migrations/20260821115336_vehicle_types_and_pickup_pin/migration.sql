-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTORCYCLE', 'TRICYCLE', 'PICKUP', 'TRUCK');

-- AlterTable
ALTER TABLE "courier_profiles" ADD COLUMN     "vehicle_type" "VehicleType" NOT NULL DEFAULT 'MOTORCYCLE';

-- AlterTable
ALTER TABLE "errand_details" ADD COLUMN     "pickup_lat" DECIMAL(10,7),
ADD COLUMN     "pickup_lng" DECIMAL(10,7);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "vehicle_type" "VehicleType";
