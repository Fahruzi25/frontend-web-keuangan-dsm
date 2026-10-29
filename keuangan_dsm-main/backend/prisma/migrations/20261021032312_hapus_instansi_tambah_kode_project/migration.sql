/*
  Warnings:

  - You are about to drop the column `instansi_id` on the `project` table. All the data in the column will be lost.
  - You are about to drop the `instansi` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[kode_project]` on the table `project` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `kode_project` to the `project` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_instansi_id_fkey";

-- DropIndex
DROP INDEX "project_instansi_id_deskripsi_pekerjaan_key";

-- AlterTable
ALTER TABLE "project" DROP COLUMN "instansi_id",
ADD COLUMN     "kode_project" TEXT NOT NULL,
ADD COLUMN     "nama_instansi" TEXT;

-- DropTable
DROP TABLE "instansi";

-- CreateIndex
CREATE UNIQUE INDEX "project_kode_project_key" ON "project"("kode_project");
