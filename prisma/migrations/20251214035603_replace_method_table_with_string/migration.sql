/*
  Warnings:

  - You are about to drop the `brew_methods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `method_id` on the `brews` table. All the data in the column will be lost.
  - Made the column `type` on table `brewers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "brew_methods";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_brewers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "bar_id" INTEGER,
    CONSTRAINT "brewers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brewers_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_brewers" ("bar_id", "created_by", "id", "name", "notes", "type") SELECT "bar_id", "created_by", "id", "name", "notes", "type" FROM "brewers";
DROP TABLE "brewers";
ALTER TABLE "new_brewers" RENAME TO "brewers";
CREATE TABLE "new_brews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "bean_id" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'Other',
    "grinder_id" INTEGER,
    "brewer_id" INTEGER,
    "bar_id" INTEGER,
    "brew_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dose_weight" REAL NOT NULL,
    "yield_weight" REAL,
    "brew_time" INTEGER,
    "grind_size" TEXT,
    "water_temperature" REAL,
    "bloom_time" INTEGER,
    "pour_pattern" TEXT,
    "rating" INTEGER DEFAULT 0,
    "tasting_notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brews_bean_id_fkey" FOREIGN KEY ("bean_id") REFERENCES "beans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brews_grinder_id_fkey" FOREIGN KEY ("grinder_id") REFERENCES "grinders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "brews_brewer_id_fkey" FOREIGN KEY ("brewer_id") REFERENCES "brewers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "brews_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_brews" ("bar_id", "bean_id", "bloom_time", "brew_date", "brew_time", "brewer_id", "created_at", "dose_weight", "grind_size", "grinder_id", "id", "pour_pattern", "rating", "tasting_notes", "user_id", "water_temperature", "yield_weight") SELECT "bar_id", "bean_id", "bloom_time", "brew_date", "brew_time", "brewer_id", "created_at", "dose_weight", "grind_size", "grinder_id", "id", "pour_pattern", "rating", "tasting_notes", "user_id", "water_temperature", "yield_weight" FROM "brews";
DROP TABLE "brews";
ALTER TABLE "new_brews" RENAME TO "brews";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
