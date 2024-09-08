/*
  Warnings:

  - The values [funding,payment,creating_account,logging_in,card,editing_profile] on the enum `ReportCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReportCategory_new" AS ENUM ('FUNDING', 'PAYMENT', 'CREATING_ACCOUNT', 'LOGGING_IN', 'CARD', 'EDIT_PROFILE');
ALTER TYPE "ReportCategory" RENAME TO "ReportCategory_old";
ALTER TYPE "ReportCategory_new" RENAME TO "ReportCategory";
DROP TYPE "ReportCategory_old";
COMMIT;
