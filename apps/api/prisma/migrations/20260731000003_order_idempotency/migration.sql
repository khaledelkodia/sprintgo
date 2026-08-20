-- Idempotent order creation: retried submits (flaky mobile networks, double-taps)
-- return the original order instead of creating a duplicate (docs/architecture/04 §3).
ALTER TABLE "orders" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");
