/*
  Warnings:

  - A unique constraint covering the columns `[businessId]` on the table `Station` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "businessId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Station_businessId_key" ON "Station"("businessId");

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
