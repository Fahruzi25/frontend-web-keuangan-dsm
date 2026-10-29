-- CreateEnum
CREATE TYPE "JenisTermin" AS ENUM ('UANG_MUKA', 'TERMIN_1', 'TERMIN_2', 'TERMIN_3', 'RETENSI');

-- CreateEnum
CREATE TYPE "StatusPencairan" AS ENUM ('PROSES', 'DONE');

-- CreateTable
CREATE TABLE "instansi" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instansi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" SERIAL NOT NULL,
    "instansi_id" INTEGER,
    "nomor_inaproc" TEXT NOT NULL,
    "tanggal_kontrak" DATE,
    "nomor_kontrak" TEXT,
    "deskripsi_pekerjaan" TEXT,
    "nilai_kontrak" DECIMAL(18,2),
    "persen_potongan" DECIMAL(5,2) NOT NULL DEFAULT 1.75,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pencairan_sp2d" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "jenis" "JenisTermin" NOT NULL,
    "realisasi" DECIMAL(18,2) NOT NULL,
    "status" "StatusPencairan" NOT NULL DEFAULT 'PROSES',
    "tgl_pencairan" DATE,

    CONSTRAINT "pencairan_sp2d_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instansi_nama_key" ON "instansi"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "project_nomor_inaproc_key" ON "project"("nomor_inaproc");

-- CreateIndex
CREATE UNIQUE INDEX "project_instansi_id_deskripsi_pekerjaan_key" ON "project"("instansi_id", "deskripsi_pekerjaan");

-- CreateIndex
CREATE UNIQUE INDEX "pencairan_sp2d_project_id_jenis_key" ON "pencairan_sp2d"("project_id", "jenis");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_instansi_id_fkey" FOREIGN KEY ("instansi_id") REFERENCES "instansi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pencairan_sp2d" ADD CONSTRAINT "pencairan_sp2d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
