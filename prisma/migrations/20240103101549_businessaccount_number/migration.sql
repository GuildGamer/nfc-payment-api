/*
  Warnings:

  - A unique constraint covering the columns `[businessId]` on the table `bank accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "bank accounts" ADD COLUMN     "businessId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bank accounts_businessId_key" ON "bank accounts"("businessId");

-- AddForeignKey
ALTER TABLE "bank accounts" ADD CONSTRAINT "bank accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
