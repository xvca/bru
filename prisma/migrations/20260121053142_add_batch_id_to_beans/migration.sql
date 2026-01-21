-- AlterTable
ALTER TABLE "beans" ADD COLUMN "batch_id" TEXT;

-- CreateIndex
CREATE INDEX "beans_batch_id_idx" ON "beans"("batch_id");

-- Populate batch IDs for existing beans
-- Group beans by name, roaster, and roast date (batch key)
-- Assign the same batch_id to all beans in the same batch

-- Create a temporary table to store unique batch keys with generated IDs
CREATE TEMPORARY TABLE temp_batches AS
SELECT DISTINCT
  name,
  COALESCE(roaster, 'UNKNOWN') as roaster,
  DATE(roast_date) as roast_date,
  lower(hex(randomblob(4))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  lower(hex(randomblob(6))) as batch_id
FROM beans
WHERE batch_id IS NULL;

-- Update beans with their batch IDs based on matching batch key
UPDATE beans
SET batch_id = (
  SELECT tb.batch_id
  FROM temp_batches tb
  WHERE beans.name = tb.name
    AND COALESCE(beans.roaster, 'UNKNOWN') = tb.roaster
    AND DATE(beans.roast_date) = tb.roast_date
)
WHERE batch_id IS NULL;

-- Clean up temporary table
DROP TABLE temp_batches;
