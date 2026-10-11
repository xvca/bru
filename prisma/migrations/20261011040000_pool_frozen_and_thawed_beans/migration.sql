-- A bag now tracks its frozen grams instead of splitting into a new bean
-- for every partial thaw. remaining_weight stays the bag's total (open +
-- frozen); thaw_date is the most recent thaw.

-- AlterTable
ALTER TABLE "beans" ADD COLUMN "frozen_weight" REAL NOT NULL DEFAULT 0;
ALTER TABLE "beans" ADD COLUMN "last_thaw_weight" REAL;

-- Anything frozen and never thawed is entirely in the freezer
UPDATE "beans"
SET "frozen_weight" = COALESCE("remaining_weight", "initial_weight")
WHERE "freeze_date" IS NOT NULL AND "thaw_date" IS NULL;

-- Partial thaws created extra beans sharing a batch_id. Fold each batch into
-- its original bean (the lowest id), which kept the full bag size.
CREATE TEMP TABLE "bean_merge" AS
SELECT b."id" AS "old_id",
       (SELECT MIN(o."id") FROM "beans" o WHERE o."batch_id" = b."batch_id") AS "keep_id"
FROM "beans" b
WHERE b."batch_id" IS NOT NULL;

UPDATE "beans"
SET
  "remaining_weight" = (
    SELECT SUM(COALESCE(p."remaining_weight", 0)) FROM "beans" p
    WHERE p."batch_id" = "beans"."batch_id"),
  "frozen_weight" = (
    SELECT SUM(p."frozen_weight") FROM "beans" p
    WHERE p."batch_id" = "beans"."batch_id"),
  "thaw_date" = (
    SELECT MAX(p."thaw_date") FROM "beans" p
    WHERE p."batch_id" = "beans"."batch_id"),
  "freeze_date" = COALESCE("freeze_date", (
    SELECT MAX(p."freeze_date") FROM "beans" p
    WHERE p."batch_id" = "beans"."batch_id"))
WHERE "id" IN (
  SELECT "keep_id" FROM "bean_merge" WHERE "old_id" <> "keep_id");

-- Each split portion was exactly one thaw; remember the size of the latest
UPDATE "beans"
SET "last_thaw_weight" = (
  SELECT p."initial_weight" FROM "beans" p
  JOIN "bean_merge" m ON m."old_id" = p."id" AND m."old_id" <> m."keep_id"
  WHERE p."batch_id" = "beans"."batch_id" AND p."thaw_date" IS NOT NULL
  ORDER BY p."thaw_date" DESC, p."id" DESC
  LIMIT 1)
WHERE "id" IN (
  SELECT "keep_id" FROM "bean_merge" WHERE "old_id" <> "keep_id");

UPDATE "brews"
SET "bean_id" = (SELECT "keep_id" FROM "bean_merge" WHERE "old_id" = "brews"."bean_id")
WHERE "bean_id" IN (SELECT "old_id" FROM "bean_merge" WHERE "old_id" <> "keep_id");

UPDATE "app_settings"
SET "default_regular_bean_id" = (
  SELECT "keep_id" FROM "bean_merge" WHERE "old_id" = "app_settings"."default_regular_bean_id")
WHERE "default_regular_bean_id" IN (
  SELECT "old_id" FROM "bean_merge" WHERE "old_id" <> "keep_id");

UPDATE "app_settings"
SET "default_decaf_bean_id" = (
  SELECT "keep_id" FROM "bean_merge" WHERE "old_id" = "app_settings"."default_decaf_bean_id")
WHERE "default_decaf_bean_id" IN (
  SELECT "old_id" FROM "bean_merge" WHERE "old_id" <> "keep_id");

DELETE FROM "beans"
WHERE "id" IN (SELECT "old_id" FROM "bean_merge" WHERE "old_id" <> "keep_id");

DROP TABLE "bean_merge";

-- Frozen grams can never exceed what's left
UPDATE "beans"
SET "frozen_weight" = MAX(0, MIN("frozen_weight", COALESCE("remaining_weight", "frozen_weight")));
