-- CreateTable
CREATE TABLE "device_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "bar_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "device_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_tokens_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "device_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_brew_bars" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "default_regular_bean_id" INTEGER,
    "default_decaf_bean_id" INTEGER,
    CONSTRAINT "brew_bars_default_regular_bean_id_fkey" FOREIGN KEY ("default_regular_bean_id") REFERENCES "beans" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "brew_bars_default_decaf_bean_id_fkey" FOREIGN KEY ("default_decaf_bean_id") REFERENCES "beans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_brew_bars" ("created_at", "created_by", "id", "location", "name") SELECT "created_at", "created_by", "id", "location", "name" FROM "brew_bars";
DROP TABLE "brew_bars";
ALTER TABLE "new_brew_bars" RENAME TO "brew_bars";
CREATE TABLE "new_brews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "bean_id" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "grinder_id" INTEGER,
    "brewer_id" INTEGER,
    "bar_id" INTEGER,
    "dose_weight" REAL NOT NULL,
    "yield_weight" REAL,
    "brew_time" INTEGER,
    "grind_size" REAL,
    "water_temperature" REAL,
    "bloom_time" INTEGER,
    "pour_pattern" TEXT,
    "rating" INTEGER DEFAULT 0,
    "tasting_notes" TEXT,
    "auto_created" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brews_bean_id_fkey" FOREIGN KEY ("bean_id") REFERENCES "beans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brews_grinder_id_fkey" FOREIGN KEY ("grinder_id") REFERENCES "grinders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "brews_brewer_id_fkey" FOREIGN KEY ("brewer_id") REFERENCES "brewers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "brews_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_brews" ("bar_id", "bean_id", "bloom_time", "brew_time", "brewer_id", "created_at", "dose_weight", "grind_size", "grinder_id", "id", "method", "pour_pattern", "rating", "tasting_notes", "user_id", "water_temperature", "yield_weight") SELECT "bar_id", "bean_id", "bloom_time", "brew_time", "brewer_id", "created_at", "dose_weight", "grind_size", "grinder_id", "id", "method", "pour_pattern", "rating", "tasting_notes", "user_id", "water_temperature", "yield_weight" FROM "brews";
DROP TABLE "brews";
ALTER TABLE "new_brews" RENAME TO "brews";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");
