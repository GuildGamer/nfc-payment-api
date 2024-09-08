/*
  Warnings:

  - The values [FUNDING] on the enum `CustomerReportCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CustomerReportCategory_new" AS ENUM ('funding', 'payment', 'creating_account', 'logging_in', 'card', 'editing_profile');
ALTER TYPE "CustomerReportCategory" RENAME TO "CustomerReportCategory_old";
ALTER TYPE "CustomerReportCategory_new" RENAME TO "CustomerReportCategory";
DROP TYPE "CustomerReportCategory_old";
COMMIT;