/*
  Warnings:

  - Made the column `amount` on table `Station` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Station" ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "amount" SET DEFAULT 0.0;
