import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { periksa } from "../lib/http";
import { terbaruDulu, type TransaksiDb } from "../lib/rekap";
import { tglKeString } from "../lib/tipe";

const router = Router();

const skemaQuery = z.object({
    // "01".."12"; kosong = semua bulan
    bulan: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^(0[1-9]|1[0-2])$/, "Bulan harus 01 sampai 12.").optional()),
    // opsional; frontend saat ini belum mengirim tahun
    tahun: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}$/, "Tahun harus 4 angka.").optional()),
});

// GET /api/operasional?bulan=10  -> pengeluaran operasional (giro dan kas), terbaru di atas
router.get("/", async (req, res) => {
    const { bulan, tahun } = periksa(skemaQuery, req.query, "Filter tidak valid.");

    const semua = await prisma.transaksi.findMany({ where: { klasifikasi: "OPERASIONAL", arah: "KELUAR" } });
    const rows = (semua as TransaksiDb[])
        .filter((t) => {
            const tgl = tglKeString(t.tanggal);
            return (!bulan || tgl.slice(5, 7) === bulan) && (!tahun || tgl.slice(0, 4) === tahun);
        })
        .sort(terbaruDulu)
        .map((t) => ({
            id: t.id,
            tanggal: tglKeString(t.tanggal),
            rekening: t.rekening,
            keterangan: t.keterangan,
            kategori: t.kategori || "Lainnya",
            subkategori: t.subkategori || "Lainnya",
            nominal: t.nominal.toDecimalPlaces(2).toNumber(),
            noInvoice: t.noInvoice,
        }));
    res.json(rows);
});

export default router;
