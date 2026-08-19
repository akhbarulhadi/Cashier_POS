-- =============================================================================
-- Migration: add_store_multitenant
-- Purpose  : Convert from single-tenant (StoreSetting) to multi-tenant (Store).
--
-- Strategy (safe for existing data):
--   1. Create the `stores` table (replaces `store_settings`).
--   2. Migrate data from `store_settings` → `stores`.
--   3. Add `store_id` as NULLABLE first on all tables.
--   4. Backfill existing rows with the single migrated store.
--   5. Add NOT NULL + FK constraints (categories, products, customers, transactions).
--   6. Drop old `store_settings` table.
--   7. Create all indexes and composite unique constraints.
-- =============================================================================

-- Step 1: Create `stores` table
CREATE TABLE "stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo_url" TEXT,
    "receipt_footer" TEXT,
    "default_tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- Step 2: Migrate data from `store_settings` → `stores`
INSERT INTO "stores" ("id", "name", "address", "phone", "email", "logo_url", "receipt_footer", "default_tax_percent", "currency", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    COALESCE("store_name", 'Toko Utama'),
    "address",
    "phone",
    "email",
    "logo_url",
    "receipt_footer",
    COALESCE("default_tax_percent", 0),
    COALESCE("currency", 'IDR'),
    "created_at",
    "updated_at"
FROM "store_settings"
LIMIT 1;

-- If store_settings was empty, ensure at least one store exists
INSERT INTO "stores" ("name", "currency", "default_tax_percent", "updated_at")
SELECT 'Toko Utama', 'IDR', 0, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "stores");

-- Step 3a: Add nullable `store_id` columns to all relevant tables
ALTER TABLE "users"             ADD COLUMN "store_id" UUID;
ALTER TABLE "categories"        ADD COLUMN "store_id" UUID;
ALTER TABLE "products"          ADD COLUMN "store_id" UUID;
ALTER TABLE "customers"         ADD COLUMN "store_id" UUID;
ALTER TABLE "transactions"      ADD COLUMN "store_id" UUID;
ALTER TABLE "audit_logs"        ADD COLUMN "store_id" UUID;
ALTER TABLE "ai_chat_sessions"  ADD COLUMN "store_id" UUID;

-- Step 4: Backfill all existing rows with the first (and only) store
UPDATE "users"            SET "store_id" = (SELECT "id" FROM "stores" LIMIT 1) WHERE "store_id" IS NULL;
UPDATE "categories"       SET "store_id" = (SELECT "id" FROM "stores" LIMIT 1) WHERE "store_id" IS NULL;
UPDATE "products"         SET "store_id" = (SELECT "id" FROM "stores" LIMIT 1) WHERE "store_id" IS NULL;
UPDATE "customers"        SET "store_id" = (SELECT "id" FROM "stores" LIMIT 1) WHERE "store_id" IS NULL;
UPDATE "transactions"     SET "store_id" = (SELECT "id" FROM "stores" LIMIT 1) WHERE "store_id" IS NULL;
UPDATE "audit_logs"       SET "store_id" = (SELECT "id" FROM "stores" LIMIT 1) WHERE "store_id" IS NULL;
UPDATE "ai_chat_sessions" SET "store_id" = (SELECT "id" FROM "stores" LIMIT 1) WHERE "store_id" IS NULL;

-- Step 5a: Remove old global unique indexes (replaced by per-store composites)
DROP INDEX IF EXISTS "categories_name_key";
DROP INDEX IF EXISTS "customers_email_key";
DROP INDEX IF EXISTS "customers_phone_key";
DROP INDEX IF EXISTS "products_barcode_key";
DROP INDEX IF EXISTS "products_sku_key";

-- Step 5b: Set NOT NULL on tables where store_id is required
ALTER TABLE "categories"    ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "products"      ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "customers"     ALTER COLUMN "store_id" SET NOT NULL;
ALTER TABLE "transactions"  ALTER COLUMN "store_id" SET NOT NULL;

-- Step 5c: Add Foreign Key constraints
ALTER TABLE "users"            ADD CONSTRAINT "users_store_id_fkey"            FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "categories"       ADD CONSTRAINT "categories_store_id_fkey"       FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products"         ADD CONSTRAINT "products_store_id_fkey"         FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customers"        ADD CONSTRAINT "customers_store_id_fkey"        FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions"     ADD CONSTRAINT "transactions_store_id_fkey"     FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs"       ADD CONSTRAINT "audit_logs_store_id_fkey"       FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Drop old `store_settings` table (data already migrated to `stores`)
DROP TABLE IF EXISTS "store_settings";

-- Step 7: Create indexes and composite unique constraints
CREATE INDEX "users_store_id_idx"             ON "users"("store_id");
CREATE INDEX "categories_store_id_idx"        ON "categories"("store_id");
CREATE UNIQUE INDEX "categories_store_id_name_key"  ON "categories"("store_id", "name");
CREATE INDEX "customers_store_id_idx"         ON "customers"("store_id");
CREATE UNIQUE INDEX "customers_store_id_phone_key"  ON "customers"("store_id", "phone") WHERE "phone" IS NOT NULL;
CREATE UNIQUE INDEX "customers_store_id_email_key"  ON "customers"("store_id", "email") WHERE "email" IS NOT NULL;
CREATE INDEX "products_store_id_idx"          ON "products"("store_id");
CREATE UNIQUE INDEX "products_store_id_sku_key"     ON "products"("store_id", "sku");
CREATE UNIQUE INDEX "products_store_id_barcode_key" ON "products"("store_id", "barcode") WHERE "barcode" IS NOT NULL;
CREATE INDEX "transactions_store_id_idx"      ON "transactions"("store_id");
CREATE INDEX "audit_logs_store_id_idx"        ON "audit_logs"("store_id");
CREATE INDEX "ai_chat_sessions_store_id_idx"  ON "ai_chat_sessions"("store_id");
