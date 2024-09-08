-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "processorResponse" TEXT NOT NULL DEFAULT 'failed',
ADD COLUMN     "processorTrxId" TEXT;
