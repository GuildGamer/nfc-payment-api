/*
  Warnings:

  - A unique constraint covering the columns `[businessId]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "wallets_businessId_key" ON "wallets"("businessId");
