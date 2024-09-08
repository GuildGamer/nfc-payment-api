-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "roles" "Role"[] DEFAULT ARRAY['MERCHANT']::"Role"[];
