-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "processor" "PaymentProcessor" NOT NULL DEFAULT 'FLUTTERWAVE';
