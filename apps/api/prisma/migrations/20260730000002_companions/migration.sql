-- Companion SQL Prisma can't express (docs/architecture/03 §4)

-- typo-tolerant Arabic search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "idx_products_name_trgm" ON "products" USING gin ("name" gin_trgm_ops);
CREATE INDEX "idx_stores_name_trgm" ON "stores" USING gin ("name" gin_trgm_ops);

-- data-integrity checks
ALTER TABLE "reviews" ADD CONSTRAINT "chk_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "order_items" ADD CONSTRAINT "chk_qty_positive" CHECK ("quantity" > 0);

-- human-friendly order codes: SG-<year>-<seq>
CREATE SEQUENCE IF NOT EXISTS "order_code_seq";

-- at most ONE active courier per order; reassignment cancels + recreates
CREATE UNIQUE INDEX "uq_active_assignment"
  ON "delivery_assignments"("order_id")
  WHERE "status" IN ('ASSIGNED', 'PICKED_UP');
