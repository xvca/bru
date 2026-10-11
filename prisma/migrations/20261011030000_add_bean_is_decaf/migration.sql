-- AlterTable
ALTER TABLE "beans" ADD COLUMN "is_decaf" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: beans with "decaf" in the name (Decaf, Decaffeinated, ...)
UPDATE "beans" SET "is_decaf" = true WHERE lower("name") LIKE '%decaf%';
