-- CreateEnum
CREATE TYPE "StationType" AS ENUM ('VEHICLE');

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "type" "StationType" NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);
