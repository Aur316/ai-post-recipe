/*
  Warnings:

  - You are about to alter the column `brandName` on the `Run` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(120)`.
  - You are about to alter the column `instagram` on the `Run` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2048)`.

*/
-- AlterTable
ALTER TABLE "Run" ALTER COLUMN "brandName" SET DATA TYPE VARCHAR(120),
ALTER COLUMN "instagram" SET DATA TYPE VARCHAR(2048);

-- Text fields inside the brief JSON. Keep in sync with BRIEF_LIMITS in packages/shared.
ALTER TABLE "Run" ADD CONSTRAINT "run_brief_text_limits" CHECK (
  char_length(coalesce("brief"->>'reason', '')) <= 1000
  AND char_length(coalesce("brief"->>'audience', '')) <= 1000
  AND char_length(coalesce("brief"->>'goals', '')) <= 1000
  AND char_length(coalesce("brief"->>'inspiration', '')) <= 2000
  AND NOT jsonb_path_exists("brief", '$.products[*].name ? (@ like_regex "^.{201}" flag "s")')
);
