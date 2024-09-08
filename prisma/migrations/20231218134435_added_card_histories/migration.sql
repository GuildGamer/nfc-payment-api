-- CreateEnum
CREATE TYPE "CardAction" AS ENUM ('ATTACH', 'DETTACH', 'DELETE');

-- CreateTable
CREATE TABLE "CardHistory" (
    "id" SERIAL NOT NULL,
    "createdById" TEXT NOT NULL,
    "cardId" INTEGER NOT NULL,
    "action" "CardAction" NOT NULL,

    CONSTRAINT "CardHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CardHistory" ADD CONSTRAINT "CardHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardHistory" ADD CONSTRAINT "CardHistory_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
