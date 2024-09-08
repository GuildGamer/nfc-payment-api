/*
  Warnings:

  - You are about to drop the `UserRoleInBusiness` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserRoleInBusiness" DROP CONSTRAINT "UserRoleInBusiness_businessId_fkey";

-- DropForeignKey
ALTER TABLE "UserRoleInBusiness" DROP CONSTRAINT "UserRoleInBusiness_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roleInBusiness" "RoleInBusinessEnum";

-- DropTable
DROP TABLE "UserRoleInBusiness";
