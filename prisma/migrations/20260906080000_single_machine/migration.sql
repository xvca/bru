PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Preserve the first configured defaults and preference for the single machine.
CREATE TEMP TABLE "migrated_settings" AS
SELECT
    COALESCE((SELECT "decaf_start_hour" FROM "users" ORDER BY "id" LIMIT 1), 23) AS "decaf_start_hour",
    (SELECT "default_regular_bean_id" FROM "brew_bars" WHERE "default_regular_bean_id" IS NOT NULL ORDER BY "id" LIMIT 1) AS "default_regular_bean_id",
    (SELECT "default_decaf_bean_id" FROM "brew_bars" WHERE "default_decaf_bean_id" IS NOT NULL ORDER BY "id" LIMIT 1) AS "default_decaf_bean_id";

CREATE TABLE "new_beans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "roaster" TEXT,
    "origin" TEXT,
    "roast_level" TEXT,
    "roast_date" DATETIME NOT NULL,
    "freeze_date" DATETIME,
    "thaw_date" DATETIME,
    "initial_weight" REAL NOT NULL,
    "remaining_weight" REAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batch_id" TEXT,
    "process" TEXT,
    "producer" TEXT
);
INSERT INTO "new_beans" ("batch_id", "created_at", "freeze_date", "id", "initial_weight", "name", "notes", "origin", "process", "producer", "remaining_weight", "roast_date", "roast_level", "roaster", "thaw_date")
SELECT "batch_id", "created_at", "freeze_date", "id", "initial_weight", "name", "notes", "origin", "process", "producer", "remaining_weight", "roast_date", "roast_level", "roaster", "thaw_date" FROM "beans";

CREATE TABLE "new_brewers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT
);
INSERT INTO "new_brewers" ("id", "name", "notes", "type")
SELECT "id", "name", "notes", "type" FROM "brewers";

CREATE TABLE "new_grinders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "burr_type" TEXT,
    "notes" TEXT
);
INSERT INTO "new_grinders" ("burr_type", "id", "name", "notes")
SELECT "burr_type", "id", "name", "notes" FROM "grinders";

CREATE TABLE "new_brews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bean_id" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "grinder_id" INTEGER,
    "brewer_id" INTEGER,
    "dose_weight" REAL NOT NULL,
    "yield_weight" REAL,
    "brew_time" INTEGER,
    "grind_size" REAL,
    "water_temperature" REAL,
    "bloom_time" INTEGER,
    "rating" INTEGER DEFAULT 0,
    "notes" TEXT,
    "auto_created" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brews_bean_id_fkey" FOREIGN KEY ("bean_id") REFERENCES "beans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brews_grinder_id_fkey" FOREIGN KEY ("grinder_id") REFERENCES "grinders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "brews_brewer_id_fkey" FOREIGN KEY ("brewer_id") REFERENCES "brewers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_brews" ("auto_created", "bean_id", "bloom_time", "brew_time", "brewer_id", "created_at", "dose_weight", "grind_size", "grinder_id", "id", "method", "notes", "rating", "water_temperature", "yield_weight")
SELECT "auto_created", "bean_id", "bloom_time", "brew_time", "brewer_id", "created_at", "dose_weight", "grind_size", "grinder_id", "id", "method", "notes", "rating", "water_temperature", "yield_weight" FROM "brews";

CREATE TABLE "new_device_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "device_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_device_tokens" ("created_at", "device_name", "id", "last_used_at", "token")
SELECT "created_at", "device_name", "id", "last_used_at", "token" FROM "device_tokens";

DROP TABLE "auth_sessions";
DROP TABLE "brew_bar_members";
DROP TABLE "brews";
DROP TABLE "device_tokens";
DROP TABLE "beans";
DROP TABLE "brewers";
DROP TABLE "grinders";
DROP TABLE "brew_bars";
DROP TABLE "users";

ALTER TABLE "new_beans" RENAME TO "beans";
ALTER TABLE "new_brewers" RENAME TO "brewers";
ALTER TABLE "new_grinders" RENAME TO "grinders";
ALTER TABLE "new_brews" RENAME TO "brews";
ALTER TABLE "new_device_tokens" RENAME TO "device_tokens";

CREATE INDEX "beans_batch_id_idx" ON "beans"("batch_id");
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "decaf_start_hour" INTEGER NOT NULL DEFAULT 23,
    "default_regular_bean_id" INTEGER,
    "default_decaf_bean_id" INTEGER,
    CONSTRAINT "app_settings_default_regular_bean_id_fkey" FOREIGN KEY ("default_regular_bean_id") REFERENCES "beans" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "app_settings_default_decaf_bean_id_fkey" FOREIGN KEY ("default_decaf_bean_id") REFERENCES "beans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "app_settings" ("id", "decaf_start_hour", "default_regular_bean_id", "default_decaf_bean_id")
SELECT 1, "decaf_start_hour", "default_regular_bean_id", "default_decaf_bean_id" FROM "migrated_settings";
DROP TABLE "migrated_settings";

COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
