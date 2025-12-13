/*
  Warnings:

  - You are about to drop the `brew_bar_equipment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "brew_bar_equipment";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "created_by" INTEGER NOT NULL,
    "bar_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "beans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "beans_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_beans" ("created_at", "created_by", "freeze_date", "id", "initial_weight", "name", "notes", "origin", "remaining_weight", "roast_date", "roast_level", "roaster", "thaw_date") SELECT "created_at", "created_by", "freeze_date", "id", "initial_weight", "name", "notes", "origin", "remaining_weight", "roast_date", "roast_level", "roaster", "thaw_date" FROM "beans";
DROP TABLE "beans";
ALTER TABLE "new_beans" RENAME TO "beans";
CREATE TABLE "new_equipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "bar_id" INTEGER,
    CONSTRAINT "equipment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "equipment_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_equipment" ("created_by", "id", "name", "notes", "type") SELECT "created_by", "id", "name", "notes", "type" FROM "equipment";
DROP TABLE "equipment";
ALTER TABLE "new_equipment" RENAME TO "equipment";
CREATE TABLE "new_grinders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "burr_type" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "bar_id" INTEGER,
    CONSTRAINT "grinders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "grinders_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_grinders" ("burr_type", "created_by", "id", "name", "notes") SELECT "burr_type", "created_by", "id", "name", "notes" FROM "grinders";
DROP TABLE "grinders";
ALTER TABLE "new_grinders" RENAME TO "grinders";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
