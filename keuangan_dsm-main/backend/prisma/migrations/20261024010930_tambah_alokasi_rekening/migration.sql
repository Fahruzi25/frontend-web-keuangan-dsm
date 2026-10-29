-- CreateEnum
CREATE TYPE "AlokasiDana" AS ENUM ('PROJECT', 'DONASI');

-- AlterTable
ALTER TABLE "rekening" ADD COLUMN     "alokasi" "AlokasiDana";
