-- DropIndex
DROP INDEX "idx_products_name_trgm";

-- DropIndex
DROP INDEX "idx_stores_name_trgm";

-- CreateTable
CREATE TABLE "app_roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_app_roles" (
    "user_id" TEXT NOT NULL,
    "app_role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_app_roles_pkey" PRIMARY KEY ("user_id","app_role_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_roles_key_key" ON "app_roles"("key");

-- CreateIndex
CREATE INDEX "user_app_roles_app_role_id_idx" ON "user_app_roles"("app_role_id");

-- AddForeignKey
ALTER TABLE "user_app_roles" ADD CONSTRAINT "user_app_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_app_roles" ADD CONSTRAINT "user_app_roles_app_role_id_fkey" FOREIGN KEY ("app_role_id") REFERENCES "app_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
