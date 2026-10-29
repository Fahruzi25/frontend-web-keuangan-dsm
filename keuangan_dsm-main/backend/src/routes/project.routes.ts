import { Router } from "express";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { ambilId, periksa, tolak } from "../lib/http";
import { hitungSp2d } from "../lib/sp2d";
import { olahProject } from "../lib/rekap";
import { rupiah, skemaAngka, skemaTanggal, teksOpsional, teksWajib } from "../lib/tipe";

const router = Router();

const MAKS_NILAI = 1_000_000_000_000_000; // batas kolom DECIMAL(18,2) dengan sisa aman

const skemaPekerjaan = z.object({
    id: z.preprocess((v) => (v === undefined || v === null || v === "" ? undefined : Number(v)), z.number().int().positive().optional()),
    nama: teksWajib(200, "Nama pekerjaan"),
    // kode INAPROC disimpan huruf besar supaya pengecekan unik tidak peka huruf besar/kecil
    kontrakInaproc: teksWajib(100, "Kontrak INAPROC").transform((s) => s.toUpperCase()),
    nomorKontrak: teksOpsional(100, "Nomor kontrak").transform((s) => s ?? ""),
    tglKontrak: z.preprocess((v) => (v === "" || v === null ? undefined : v), skemaTanggal("Tanggal kontrak").optional()),
    nilaiKontrak: skemaAngka("Nilai kontrak")
        .refine((n) => n >= 0 && n < MAKS_NILAI, "Nilai kontrak tidak valid (minimal 0).")
        .transform((n) => Math.round(n * 100) / 100),
    persenPotongan: skemaAngka("Persen pajak")
        .refine((n) => n >= 0 && n <= 100, "Persen pajak harus angka 0 sampai 100.")
        .transform((n) => Math.round(n * 100) / 100),
});

const skemaProject = z.object({
    nama: teksWajib(150, "Nama project"),
    pekerjaan: z.array(skemaPekerjaan, { error: "Tambahkan minimal satu pekerjaan." })
        .min(1, "Tambahkan minimal satu pekerjaan.")
        .max(100, "Pekerjaan terlalu banyak (maksimal 100 per project)."),
});
type DataProject = z.infer<typeof skemaProject>;

const urutPekerjaan = { orderBy: { id: "asc" } } as const;

async function bacaTransaksi(klausa: Prisma.TransaksiWhereInput) {
    return prisma.transaksi.findMany({ where: klausa });
}

// Pemeriksaan yang butuh database (nama / kontrak yang sama, dll)
async function cekBentrok(tx: Prisma.TransactionClient, data: DataProject, idProject: number | null) {
    const e: string[] = [];

    const kembar = await tx.project.findFirst({
        where: { nama: { equals: data.nama, mode: "insensitive" }, ...(idProject && { id: { not: idProject } }) },
        select: { id: true },
    });
    if (kembar) e.push("Nama project sudah dipakai.");

    // kontrak INAPROC kembar di dalam isian yang sama
    const lihat = new Set<string>();
    data.pekerjaan.forEach((k, i) => {
        if (lihat.has(k.kontrakInaproc)) e.push(`Pekerjaan ${i + 1}: kontrak INAPROC ${k.kontrakInaproc} diisi dua kali.`);
        lihat.add(k.kontrakInaproc);
    });

    // kontrak INAPROC sudah dipakai pekerjaan lain
    const idSendiri = data.pekerjaan.map((k) => k.id).filter((x): x is number => !!x);
    const dipakai = await tx.pekerjaan.findMany({
        where: { kontrakInaproc: { in: [...lihat] }, ...(idSendiri.length && { id: { notIn: idSendiri } }) },
        select: { kontrakInaproc: true },
    });
    dipakai.forEach((d) => e.push(`Kontrak INAPROC ${d.kontrakInaproc} sudah dipakai pekerjaan lain.`));

    if (e.length) throw tolak(422, "Data project belum lengkap.", e);
}

const dataPekerjaan = (k: DataProject["pekerjaan"][number]) => ({
    nama: k.nama,
    kontrakInaproc: k.kontrakInaproc,
    nomorKontrak: k.nomorKontrak,
    tglKontrak: k.tglKontrak ? new Date(`${k.tglKontrak}T00:00:00.000Z`) : null,
    nilaiKontrak: new Prisma.Decimal(k.nilaiKontrak),
    persenPotongan: new Prisma.Decimal(k.persenPotongan),
});

// GET /api/project  -> daftar project beserta ringkasan angka
router.get("/", async (_req, res) => {
    const [projects, transaksi] = await Promise.all([
        prisma.project.findMany({ orderBy: { id: "asc" }, include: { pekerjaan: urutPekerjaan } }),
        bacaTransaksi({ pekerjaanId: { not: null } }),
    ]);
    res.json(projects.map((p) => olahProject(p, transaksi)));
});

// GET /api/project/:id  -> detail, termasuk transaksi tiap pekerjaan
router.get("/:id", async (req, res) => {
    const id = ambilId(req.params.id);
    const p = await prisma.project.findUnique({ where: { id }, include: { pekerjaan: urutPekerjaan } });
    if (!p) throw tolak(404, "Project tidak ditemukan.");
    res.json(olahProject(p, await bacaTransaksi({ projectId: id }), true));
});

// POST /api/project
router.post("/", async (req, res) => {
    const data = periksa(skemaProject, req.body, "Data project belum lengkap.");

    const dibuat = await prisma.$transaction(async (tx) => {
        await cekBentrok(tx, data, null);
        return tx.project.create({
            data: { nama: data.nama, pekerjaan: { create: data.pekerjaan.map(dataPekerjaan) } },
            include: { pekerjaan: urutPekerjaan },
        });
    });
    res.status(201).json(olahProject(dibuat, []));
});

// PUT /api/project/:id  -> ubah nama, ubah / tambah / hapus pekerjaan sekaligus
router.put("/:id", async (req, res) => {
    const id = ambilId(req.params.id);
    const data = periksa(skemaProject, req.body, "Data project belum lengkap.");

    const hasil = await prisma.$transaction(async (tx) => {
        // kunci baris project supaya dua perubahan bersamaan tidak saling menimpa
        const terkunci = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM project WHERE id = ${id} FOR UPDATE`;
        if (!terkunci.length) throw tolak(404, "Project tidak ditemukan.");

        const lama = await tx.pekerjaan.findMany({ where: { projectId: id }, ...urutPekerjaan });
        const idLama = new Set(lama.map((k) => k.id));

        // id pekerjaan dari form harus milik project ini
        const asing = data.pekerjaan.find((k) => k.id && !idLama.has(k.id));
        if (asing) throw tolak(422, "Data project belum lengkap.", ["Ada pekerjaan yang bukan milik project ini. Muat ulang halaman, lalu coba lagi."]);

        await cekBentrok(tx, data, id);

        const dipertahankan = new Set(data.pekerjaan.map((k) => k.id).filter((x): x is number => !!x));
        const dihapus = lama.filter((k) => !dipertahankan.has(k.id));

        // pekerjaan yang punya transaksi tidak boleh dihapus
        if (dihapus.length) {
            const dipakai = await tx.transaksi.groupBy({ by: ["pekerjaanId"], where: { pekerjaanId: { in: dihapus.map((k) => k.id) } } });
            if (dipakai.length) {
                const nama = dihapus.find((k) => k.id === dipakai[0]!.pekerjaanId)?.nama;
                throw tolak(409, `Pekerjaan "${nama}" masih memiliki transaksi, jadi belum bisa dihapus.`);
            }
        }

        // SP2D baru tidak boleh lebih kecil dari pencairan yang sudah tercatat
        const cairLama = await tx.transaksi.groupBy({
            by: ["pekerjaanId"], _sum: { nominal: true },
            where: { pekerjaanId: { in: [...dipertahankan] }, tahap: { not: null } },
        });
        for (const k of data.pekerjaan) {
            const cair = cairLama.find((c) => c.pekerjaanId === k.id)?._sum.nominal ?? new Prisma.Decimal(0);
            const sp2dBaru = hitungSp2d(k.nilaiKontrak, k.persenPotongan);
            if (k.id && cair.minus(sp2dBaru).gt(1)) {
                throw tolak(422, "Data project belum lengkap.", [
                    `Pekerjaan "${k.nama}": SP2D baru (${rupiah(sp2dBaru.toNumber())}) lebih kecil dari pencairan yang sudah tercatat (${rupiah(cair.toNumber())}).`,
                ]);
            }
        }

        await tx.project.update({ where: { id }, data: { nama: data.nama } });
        if (dihapus.length) await tx.pekerjaan.deleteMany({ where: { id: { in: dihapus.map((k) => k.id) } } });

        // Kontrak INAPROC bersifat unik. Bila dua pekerjaan saling bertukar kode dalam satu simpan,
        // pengosongan dulu menghindari benturan sementara di tengah proses.
        const ubah = data.pekerjaan.filter((k) => k.id);
        for (const k of ubah) {
            await tx.pekerjaan.update({ where: { id: k.id! }, data: { kontrakInaproc: `__sementara_${k.id}` } });
        }
        for (const k of ubah) await tx.pekerjaan.update({ where: { id: k.id! }, data: dataPekerjaan(k) });
        for (const k of data.pekerjaan.filter((x) => !x.id)) {
            await tx.pekerjaan.create({ data: { projectId: id, ...dataPekerjaan(k) } });
        }

        return tx.project.findUniqueOrThrow({ where: { id }, include: { pekerjaan: urutPekerjaan } });
    });

    res.json(olahProject(hasil, await bacaTransaksi({ projectId: id })));
});

// DELETE /api/project/:id  -> hanya bila belum punya transaksi
router.delete("/:id", async (req, res) => {
    const id = ambilId(req.params.id);
    await prisma.$transaction(async (tx) => {
        const terkunci = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM project WHERE id = ${id} FOR UPDATE`;
        if (!terkunci.length) throw tolak(404, "Project tidak ditemukan.");
        const n = await tx.transaksi.count({ where: { projectId: id } });
        if (n > 0) throw tolak(409, `Project masih memiliki ${n} transaksi. Hapus atau pindahkan transaksinya terlebih dahulu.`);
        await tx.project.delete({ where: { id } });
    });
    res.json({ ok: true });
});

export default router;
