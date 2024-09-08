-- CreateEnum
CREATE TYPE "WebhookSource" AS ENUM ('PAYSTACK', 'FLUTTERWAVE');

-- CreateTable
CREATE TABLE "Webhooks" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Webhooks_pkey" PRIMARY KEY ("id")
);
