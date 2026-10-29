import { Router } from "express";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { ambilId, periksa, tolak } from "../lib/http";
import { hitungSp2d, TAHAP } from "../lib/sp2d";
import { bentukTransaksi, type TransaksiDb } from "../lib/rekap";
import { rupiah, skemaAngka, skemaTanggal, teksOpsional, teksWajib } from "../lib/tipe";

const router = Router();

const MAKS_NILAI = 1_000_000_000_000_000;
const kosongJadiNull = (v: unknown) => (v === "" || v === undefined || v === null ? null : v);
const idOpsional = z.preprocess((v) => (kosongJadiNull(v) === null ? null : Number(v)), z.number().int().positive().nullable());

const skemaTransaksi = z.object({
    tanggal: skemaTanggal("Tanggal"),
    rekening: z.enum(["GIRO", "KAS"], { error: "Rekening tidak ditemukan." }),
    keterangan: teksWajib(255, "Deskripsi transaksi"),
    arah: z.enum(["MASUK", "KELUAR"], { error: "Arah dana tidak valid." }),
    nominal: skemaAngka("Nominal")
        .refine((n) => n > 0 && n < MAKS_NILAI, "Nominal harus lebih dari 0.")
        .transform((n) => Math.round(n * 100) / 100),
    klasifikasi: z.enum(["PROJECT", "OPERASIONAL"], { error: "Klasifikasi tidak valid." }),
    projectId: idOpsional,
    pekerjaanId: idOpsional,
    tahap: z.preprocess(kosongJadiNull, z.enum(TAHAP, { error: "Tahap pencairan tidak valid." }).nullable()),
    kategori: teksOpsional(100, "Kategori"),
    subkategori: teksOpsional(100, "Jenis operasional"),
    noInvoice: teksOpsional(100, "No. invoice").transform((s) => s ?? ""),
});
type DataTransaksi = z.infer<typeof skemaTransaksi>;

const sertakanNama = { project: { select: { nama: true } }, pekerjaan: { select: { nama: true } } } as const;
type TransaksiDenganNama = TransaksiDb & { project: { nama: string } | null; pekerjaan: { nama: string } | null };

const bentuk = (t: TransaksiDenganNama) => ({
    ...bentukTransaksi(t),
    namaProject: t.project?.nama ?? null,
    namaPekerjaan: t.pekerjaan?.nama ?? null,
});

const bukanSaldoAwal = (t: { keterangan: string }) => t.keterangan.trim().toUpperCase() !== "SALDO AWAL";
const num = (d: Prisma.Decimal) => d.toDecimalPlaces(2).toNumber();

// Rapikan isian sesuai klasifikasi: transaksi project tidak membawa kategori, operasional tidak membawa project.
function bersihkan(d: DataTransaksi) {
    const project = d.klasifikasi === "PROJECT";
    return {
        tanggal: new Date(`${d.tanggal}T00:00:00.000Z`),
        rekening: d.rekening,
        keterangan: d.keterangan,
        arah: d.arah,
        nominal: new Prisma.Decimal(d.nominal),
        klasifikasi: d.klasifikasi,
        projectId: project ? d.projectId : null,
        pekerjaanId: project ? d.pekerjaanId : null,
        tahap: project && d.arah === "MASUK" ? d.tahap : null,
        kategori: project ? null : d.kategori,
        subkategori: project ? null : d.subkategori,
        noInvoice: d.noInvoice,
    };
}

// Aturan bisnis, dijalankan di dalam transaksi database
async function periksaAturan(tx: Prisma.TransactionClient, t: ReturnType<typeof bersihkan>, idSaatIni: number | null) {
    if (t.rekening === "KAS" && t.arah !== "KELUAR") throw tolak(422, "Kas hanya untuk dana keluar.");

    if (t.klasifikasi === "OPERASIONAL") {
        if (!t.subkategori) throw tolak(422, "Jenis operasional wajib diisi.");
        return;
    }

    if (!t.projectId) throw tolak(422, "Pilih nama project.");
    if (!t.pekerjaanId) throw tolak(422, "Pilih pekerjaan.");

    // kunci baris pekerjaan supaya dua pencairan yang masuk bersamaan tidak sama-sama lolos batas SP2D
    const terkunci = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM pekerjaan WHERE id = ${t.pekerjaanId} FOR UPDATE`;
    const pk = terkunci.length ? await tx.pekerjaan.findUnique({ where: { id: t.pekerjaanId } }) : null;
    const project = await tx.project.findUnique({ where: { id: t.projectId }, select: { id: true } });
    if (!project) throw tolak(422, "Project tidak ditemukan. Pilih nama project.");
    if (!pk || pk.projectId !== t.projectId) throw tolak(422, "Pilih pekerjaan dari project tersebut.");

    if (t.tahap) {
        const sp2d = hitungSp2d(pk.nilaiKontrak, pk.persenPotongan);
        const agregat = await tx.transaksi.aggregate({
            _sum: { nominal: true },
            where: { pekerjaanId: pk.id, tahap: { not: null }, ...(idSaatIni && { id: { not: idSaatIni } }) },
        });
        const cair = agregat._sum.nominal ?? new Prisma.Decimal(0);
        if (cair.plus(t.nominal).gt(sp2d.plus(1))) {
            const sisa = Prisma.Decimal.max(sp2d.minus(cair), 0);
            throw tolak(422, `Total pencairan melebihi SP2D pekerjaan ini. Sisa SP2D: ${rupiah(sisa.toNumber())}.`);
        }
    }
}

// GET /api/transaksi  -> semua transaksi (lama ke baru) + saldo berjalan giro + ringkasan
router.get("/", async (_req, res) => {
    const semua = await prisma.transaksi.findMany({
        orderBy: [{ tanggal: "asc" }, { id: "asc" }],
        include: sertakanNama,
    });

    let saldo = new Prisma.Decimal(0);
    const rows = semua.map((t) => {
        if (t.rekening === "GIRO") saldo = t.arah === "MASUK" ? saldo.plus(t.nominal) : saldo.minus(t.nominal);
        return { ...bentuk(t), saldo: t.rekening === "GIRO" ? num(saldo) : null };
    });

    const hitung = (f: (t: (typeof semua)[number]) => boolean) =>
        num(semua.filter(f).reduce((s, t) => s.plus(t.nominal), new Prisma.Decimal(0)));

    res.json({
        rows,
        ringkasan: {
            saldoGiro: num(saldo),
            danaMasuk: hitung((t) => t.rekening === "GIRO" && t.arah === "MASUK" && bukanSaldoAwal(t)),
            keluarGiro: hitung((t) => t.rekening === "GIRO" && t.arah === "KELUAR"),
            keluarKas: hitung((t) => t.rekening === "KAS" && t.arah === "KELUAR"),
        },
    });
});

// GET /api/transaksi/kategori  -> saran isian untuk form (harus di atas "/:id")
router.get("/kategori", async (_req, res) => {
    const [kat, sub] = await Promise.all([
        prisma.transaksi.findMany({ where: { klasifikasi: "OPERASIONAL", kategori: { not: null } }, distinct: ["kategori"], select: { kategori: true } }),
        prisma.transaksi.findMany({ where: { klasifikasi: "OPERASIONAL", subkategori: { not: null } }, distinct: ["subkategori"], select: { subkategori: true } }),
    ]);
    const rapi = (a: (string | null)[]) => a.filter((x): x is string => !!x).sort();
    res.json({ kategori: rapi(kat.map((x) => x.kategori)), subkategori: rapi(sub.map((x) => x.subkategori)) });
});

// GET /api/transaksi/:id
router.get("/:id", async (req, res) => {
    const t = await prisma.transaksi.findUnique({ where: { id: ambilId(req.params.id) }, include: sertakanNama });
    if (!t) throw tolak(404, "Transaksi tidak ditemukan.");
    res.json(bentuk(t));
});

// POST /api/transaksi
router.post("/", async (req, res) => {
    const t = bersihkan(periksa(skemaTransaksi, req.body, "Data transaksi belum lengkap."));
    const baru = await prisma.$transaction(async (tx) => {
        await periksaAturan(tx, t, null);
        return tx.transaksi.create({ data: t, include: sertakanNama });
    });
    res.status(201).json(bentuk(baru));
});

// PUT /api/transaksi/:id
router.put("/:id", async (req, res) => {
    const id = ambilId(req.params.id);
    const t = bersihkan(periksa(skemaTransaksi, req.body, "Data transaksi belum lengkap."));
    const ubah = await prisma.$transaction(async (tx) => {
        if (!(await tx.transaksi.findUnique({ where: { id }, select: { id: true } }))) throw tolak(404, "Transaksi tidak ditemukan.");
        await periksaAturan(tx, t, id);
        return tx.transaksi.update({ where: { id }, data: t, include: sertakanNama });
    });
    res.json(bentuk(ubah));
});

// DELETE /api/transaksi/:id
router.delete("/:id", async (req, res) => {
    const { count } = await prisma.transaksi.deleteMany({ where: { id: ambilId(req.params.id) } });
    if (!count) throw tolak(404, "Transaksi tidak ditemukan.");
    res.json({ ok: true });
});

export default router;
