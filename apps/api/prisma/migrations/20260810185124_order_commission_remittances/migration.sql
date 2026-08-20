-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "platform_commission" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "courier_remittances" (
    "id" TEXT NOT NULL,
    "courier_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "recorded_by_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_remittances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_remittances_courier_id_created_at_idx" ON "courier_remittances"("courier_id", "created_at");

-- AddForeignKey
ALTER TABLE "courier_remittances" ADD CONSTRAINT "courier_remittances_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
