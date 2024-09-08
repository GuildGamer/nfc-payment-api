/*
  Warnings:

  - Made the column `businessId` on table `Station` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Station" ALTER COLUMN "businessId" SET NOT NULL;
