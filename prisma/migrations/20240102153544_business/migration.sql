/*
  Warnings:

  - You are about to drop the column `bookBalance` on the `wallets` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RoleInBusinessEnum" AS ENUM ('ADMIN', 'VIEWER');

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "bookBalance",
ADD COLUMN     "businessId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UserRoleInBusiness" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoleInBusinessEnum" NOT NULL,

    CONSTRAINT "UserRoleInBusiness_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserRoleInBusiness" ADD CONSTRAINT "UserRoleInBusiness_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleInBusiness" ADD CONSTRAINT "UserRoleInBusiness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
