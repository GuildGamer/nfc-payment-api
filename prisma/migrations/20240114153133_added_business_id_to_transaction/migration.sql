/*
  Warnings:

  - A unique constraint covering the columns `[businessId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "businessId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_businessId_key" ON "transactions"("businessId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
