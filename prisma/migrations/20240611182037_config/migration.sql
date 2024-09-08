/*
  Warnings:

  - You are about to drop the column `CreditsPerReferral` on the `configurations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentProcessor" AS ENUM ('FLUTTERWAVE', 'PAYSTACK');

-- AlterTable
ALTER TABLE "configurations" DROP COLUMN "CreditsPerReferral",
ADD COLUMN     "creditsPerReferral" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
