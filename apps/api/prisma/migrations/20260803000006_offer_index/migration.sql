-- At most one live assignment per order now also covers OFFERED (a pending offer),
-- so an order can't be offered to two couriers at once.
DROP INDEX "uq_active_assignment";
CREATE UNIQUE INDEX "uq_active_assignment"
  ON "delivery_assignments"("order_id")
  WHERE "status" IN ('OFFERED', 'ASSIGNED', 'PICKED_UP');
