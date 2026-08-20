-- Super admin can cap how many products a store lists.
ALTER TABLE "stores" ADD COLUMN "product_limit" INTEGER;
