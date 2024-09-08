/*
  Warnings:

  - Added the required column `source` to the `Webhooks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Webhooks" ADD COLUMN     "source" "WebhookSource" NOT NULL;
