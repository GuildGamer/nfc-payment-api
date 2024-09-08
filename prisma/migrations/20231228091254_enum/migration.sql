-- CreateEnum
CREATE TYPE "CustomerReportCategory" AS ENUM ('funding', 'payment', 'creating_account', 'logging_in', 'card', 'editing_profile');

-- DropEnum
DROP TYPE "ReportCategory";
