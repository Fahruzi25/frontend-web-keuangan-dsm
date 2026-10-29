-- Menyesuaikan struktur database dengan frontend (Project -> Pekerjaan, Transaksi satu tabel).
-- PERHATIAN: tabel lama (project, pencairan_sp2d, rekening, kelompok_project, pekerjaan_project)
-- dihapus dan dibuat ulang KOSONG. Tabel users tidak disentuh, jadi akun login tetap ada.

-- ===== Hapus struktur lama =====
DROP TABLE IF EXISTS "pencairan_sp2d" CASCADE;
DROP TABLE IF EXISTS "rekening" CASCADE;
DROP TABLE IF EXISTS "pekerjaan_project" CASCADE;
DROP TABLE IF EXISTS "project" CASCADE;
DROP TABLE IF EXISTS "kelompok_project" CASCADE;
DROP TABLE IF EXISTS "instansi" CASCADE;

DROP TYPE IF EXISTS "JenisTermin";
DROP TYPE IF EXISTS "StatusPencairan";
DROP TYPE IF EXISTS "TipeRekening";
DROP TYPE IF EXISTS "KategoriTransaksi";
DROP TYPE IF EXISTS "AlokasiDana";

-- ===== Enum baru =====
CREATE TYPE "JenisRekening" AS ENUM ('GIRO', 'KAS');
CREATE TYPE "ArahDana" AS ENUM ('MASUK', 'KELUAR');
CREATE TYPE "KlasifikasiTransaksi" AS ENUM ('PROJECT', 'OPERASIONAL');
CREATE TYPE "TahapPencairan" AS ENUM ('UANG_MUKA', 'TERMIN_1', 'TERMIN_2', 'TERMIN_3', 'RETENSI');

-- ===== Project =====
CREATE TABLE "project" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_nama_key" ON "project"("nama");

-- ===== Pekerjaan =====
CREATE TABLE "pekerjaan" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "kontrak_inaproc" TEXT NOT NULL,
    "nomor_kontrak" TEXT NOT NULL DEFAULT '',
    "tgl_kontrak" DATE,
    "nilai_kontrak" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "persen_potongan" DECIMAL(5,2) NOT NULL DEFAULT 1.75,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pekerjaan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pekerjaan_nilai_kontrak_cek" CHECK ("nilai_kontrak" >= 0),
    CONSTRAINT "pekerjaan_persen_potongan_cek" CHECK ("persen_potongan" >= 0 AND "persen_potongan" <= 100)
);
CREATE UNIQUE INDEX "pekerjaan_kontrak_inaproc_key" ON "pekerjaan"("kontrak_inaproc");
CREATE INDEX "pekerjaan_project_id_idx" ON "pekerjaan"("project_id");
ALTER TABLE "pekerjaan" ADD CONSTRAINT "pekerjaan_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== Transaksi =====
CREATE TABLE "transaksi" (
    "id" SERIAL NOT NULL,
    "tanggal" DATE NOT NULL,
    "rekening" "JenisRekening" NOT NULL,
    "keterangan" TEXT NOT NULL,
    "arah" "ArahDana" NOT NULL,
    "nominal" DECIMAL(18,2) NOT NULL,
    "klasifikasi" "KlasifikasiTransaksi" NOT NULL,
    "project_id" INTEGER,
    "pekerjaan_id" INTEGER,
    "tahap" "TahapPencairan",
    "kategori" TEXT,
    "subkategori" TEXT,
    "no_invoice" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaksi_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transaksi_nominal_cek" CHECK ("nominal" > 0),
    -- kas hanya untuk dana keluar
    CONSTRAINT "transaksi_kas_keluar_cek" CHECK ("rekening" <> 'KAS' OR "arah" = 'KELUAR'),
    -- transaksi project wajib punya project + pekerjaan; operasional tidak boleh punya keduanya
    CONSTRAINT "transaksi_klasifikasi_cek" CHECK (
        ("klasifikasi" = 'PROJECT' AND "project_id" IS NOT NULL AND "pekerjaan_id" IS NOT NULL)
        OR ("klasifikasi" = 'OPERASIONAL' AND "project_id" IS NULL AND "pekerjaan_id" IS NULL AND "tahap" IS NULL)
    ),
    -- tahap pencairan hanya untuk dana masuk
    CONSTRAINT "transaksi_tahap_masuk_cek" CHECK ("tahap" IS NULL OR "arah" = 'MASUK')
);
CREATE INDEX "transaksi_tanggal_idx" ON "transaksi"("tanggal");
CREATE INDEX "transaksi_project_id_idx" ON "transaksi"("project_id");
CREATE INDEX "transaksi_pekerjaan_id_tahap_idx" ON "transaksi"("pekerjaan_id", "tahap");
CREATE INDEX "transaksi_klasifikasi_arah_idx" ON "transaksi"("klasifikasi", "arah");
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_pekerjaan_id_fkey"
    FOREIGN KEY ("pekerjaan_id") REFERENCES "pekerjaan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
