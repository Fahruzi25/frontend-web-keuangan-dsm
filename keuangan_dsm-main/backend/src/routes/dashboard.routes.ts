import { Router } from "express";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { olahProject, terbaruDulu } from "../lib/rekap";
import { tahunSekarangWib, tglKeString } from "../lib/tipe";

const router = Router();

const num = (d: Prisma.Decimal) => d.toDecimalPlaces(2).toNumber();
const bukanSaldoAwal = (t: { keterangan: string }) => t.keterangan.trim().toUpperCase() !== "SALDO AWAL";

// GET /api/dashboard  -> ringkasan halaman Home
router.get("/", async (_req, res) => {
    const tahun = String(tahunSekarangWib());
    const [trx, projects] = await Promise.all([
        prisma.transaksi.findMany(),
        prisma.project.findMany({ orderBy: { id: "asc" }, include: { pekerjaan: { orderBy: { id: "asc" } } } }),
    ]);
    const jumlah = (rows: typeof trx, arah: string) =>
        rows.filter((t) => t.arah === arah).reduce((s, t) => s.plus(t.nominal), new Prisma.Decimal(0));

    const giro = trx.filter((t) => t.rekening === "GIRO");
    const setahun = giro.filter((t) => tglKeString(t.tanggal).startsWith(tahun) && bukanSaldoAwal(t));

    const perBulan = Array.from({ length: 12 }, (_, i) => {
        const awalan = `${tahun}-${String(i + 1).padStart(2, "0")}`;
        const isi = setahun.filter((t) => tglKeString(t.tanggal).startsWith(awalan));
        return { masuk: num(jumlah(isi, "MASUK")), keluar: num(jumlah(isi, "KELUAR")) };
    });

    const terbaru = trx
        .filter(bukanSaldoAwal)
        .sort(terbaruDulu)
        .slice(0, 5)
        .map((t) => ({
            id: t.id,
            tanggal: tglKeString(t.tanggal),
            keterangan: t.keterangan,
            arah: t.arah,
            nominal: num(t.nominal),
            rekening: t.rekening,
            namaProject: projects.find((p) => p.id === t.projectId)?.nama ?? null,
        }));

    const ringkasProject = projects.map((p) => olahProject(p, trx));
    const pekerjaan = ringkasProject.flatMap((p) => p.pekerjaan);
    const total = (k: "sp2d" | "cair" | "belumCair") => num(pekerjaan.reduce((s, x) => s.plus(x[k]), new Prisma.Decimal(0)));

    res.json({
        saldoGiro: num(jumlah(giro, "MASUK").minus(jumlah(giro, "KELUAR"))),
        danaMasuk: num(jumlah(setahun, "MASUK")),
        danaKeluar: num(jumlah(setahun, "KELUAR")),
        perBulan,
        terbaru,
        proyek: {
            jumlahProject: ringkasProject.length,
            projectSelesai: ringkasProject.filter((p) => p.selesai).length,
            jumlahPekerjaan: pekerjaan.length,
            pekerjaanSelesai: pekerjaan.filter((x) => x.selesai).length,
            sp2d: total("sp2d"),
            cair: total("cair"),
            belumCair: total("belumCair"),
        },
    });
});

export default router;
