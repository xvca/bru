/*
  Warnings:

  - You are about to drop the column `default_decaf_bean_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `default_regular_bean_id` on the `users` table. All the data in the column will be lost.
  - Made the column `bar_id` on table `device_tokens` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_device_tokens" (
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
INSERT INTO "new_device_tokens" ("bar_id", "created_at", "created_by", "device_name", "id", "last_used_at", "token") SELECT "bar_id", "created_at", "created_by", "device_name", "id", "last_used_at", "token" FROM "device_tokens";
DROP TABLE "device_tokens";
ALTER TABLE "new_device_tokens" RENAME TO "device_tokens";
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "default_bar_id" INTEGER,
    "decaf_start_hour" INTEGER NOT NULL DEFAULT 23
);
INSERT INTO "new_users" ("created_at", "decaf_start_hour", "default_bar_id", "id", "password", "username") SELECT "created_at", "decaf_start_hour", "default_bar_id", "id", "password", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
