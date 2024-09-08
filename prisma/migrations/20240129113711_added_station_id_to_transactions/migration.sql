/*
  Warnings:

  - A unique constraint covering the columns `[stationId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "stationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_stationId_key" ON "transactions"("stationId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
