-- CreateEnum
CREATE TYPE "TipeRekening" AS ENUM ('KAS', 'PT');

-- CreateEnum
CREATE TYPE "KategoriTransaksi" AS ENUM ('OPERASIONAL', 'PROJECT');

-- CreateTable
CREATE TABLE "rekening" (
    "id" SERIAL NOT NULL,
    "tanggal" DATE NOT NULL,
    "tipe" "TipeRekening" NOT NULL,
    "transaksi" TEXT NOT NULL,
    "kategori" "KategoriTransaksi" NOT NULL,
    "project_id" INTEGER,
    "invoice" TEXT,
    "dana_masuk" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dana_keluar" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rekening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rekening_project_id_idx" ON "rekening"("project_id");

-- CreateIndex
CREATE INDEX "rekening_tanggal_idx" ON "rekening"("tanggal");

-- AddForeignKey
ALTER TABLE "rekening" ADD CONSTRAINT "rekening_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
