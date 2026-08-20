-- Nearest-courier dispatch: persist courier location + zone centroids for pickup resolution.
ALTER TABLE "courier_profiles"
  ADD COLUMN "lat" DECIMAL(10,7),
  ADD COLUMN "lng" DECIMAL(10,7),
  ADD COLUMN "last_location_at" TIMESTAMP(3);

ALTER TABLE "zones"
  ADD COLUMN "lat" DECIMAL(10,7),
  ADD COLUMN "lng" DECIMAL(10,7);
