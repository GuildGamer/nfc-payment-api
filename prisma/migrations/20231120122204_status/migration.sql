/*
  Warnings:

  - You are about to drop the column `processorResponse` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "processorResponse",
ADD COLUMN     "processorStatus" TEXT NOT NULL DEFAULT 'failed';
