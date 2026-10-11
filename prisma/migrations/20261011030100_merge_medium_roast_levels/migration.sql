-- Medium-Light and Medium-Dark are no longer roast level options; fold them
-- (and spelling variants like "Medium Light" or "light-medium") into Medium
UPDATE "beans"
SET "roast_level" = 'Medium'
WHERE lower(replace(replace(trim("roast_level"), ' ', '-'), '_', '-'))
  IN ('medium-light', 'medium-dark', 'light-medium', 'dark-medium');
