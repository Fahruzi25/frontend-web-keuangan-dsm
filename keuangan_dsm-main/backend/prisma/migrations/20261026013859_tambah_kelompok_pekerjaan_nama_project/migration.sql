/*
  Warnings:

  - A unique constraint covering the columns `[nama_project]` on the table `project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "project" ADD COLUMN     "group_id" INTEGER,
ADD COLUMN     "nama_project" TEXT;

-- AlterTable
ALTER TABLE "rekening" ADD COLUMN     "kategori_operasional" TEXT,
ADD COLUMN     "pekerjaan" TEXT,
ADD COLUMN     "subkategori" TEXT;

-- CreateTable
CREATE TABLE "kelompok_project" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kelompok_project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pekerjaan_project" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "nama_pekerjaan" TEXT NOT NULL,

    CONSTRAINT "pekerjaan_project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kelompok_project_nama_key" ON "kelompok_project"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "pekerjaan_project_project_id_nama_pekerjaan_key" ON "pekerjaan_project"("project_id", "nama_pekerjaan");

-- CreateIndex
CREATE UNIQUE INDEX "project_nama_project_key" ON "project"("nama_project");

-- CreateIndex
CREATE INDEX "project_group_id_idx" ON "project"("group_id");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "kelompok_project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pekerjaan_project" ADD CONSTRAINT "pekerjaan_project_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
