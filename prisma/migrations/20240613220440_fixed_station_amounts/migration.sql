-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "amountIsFixed" BOOLEAN NOT NULL DEFAULT false;
