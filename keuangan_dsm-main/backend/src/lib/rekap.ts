import { Prisma } from "../../generated/prisma/client";
import { hitungSp2d, LABEL_TAHAP, TAHAP } from "./sp2d";
import { tglKeString } from "./tipe";

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);
const num = (d: Prisma.Decimal) => d.toDecimalPlaces(2).toNumber();
const jumlahkan = (rows: { nominal: Prisma.Decimal }[]) => rows.reduce((s, t) => s.plus(t.nominal), D(0));

export type PekerjaanDb = {
    id: number; projectId: number; nama: string; kontrakInaproc: string; nomorKontrak: string; tglKontrak: Date | null;
    nilaiKontrak: Prisma.Decimal; persenPotongan: Prisma.Decimal;
};
export type TransaksiDb = {
    id: number; tanggal: Date; rekening: string; keterangan: string; arah: string; nominal: Prisma.Decimal;
    klasifikasi: string; projectId: number | null; pekerjaanId: number | null; tahap: string | null;
    kategori: string | null; subkategori: string | null; noInvoice: string;
};

// Bentuk transaksi untuk frontend: nominal berupa angka, tanggal berupa YYYY-MM-DD
export const bentukTransaksi = (t: TransaksiDb) => ({
    id: t.id,
    tanggal: tglKeString(t.tanggal),
    rekening: t.rekening,
    keterangan: t.keterangan,
    arah: t.arah,
    nominal: num(t.nominal),
    klasifikasi: t.klasifikasi,
    projectId: t.projectId,
    pekerjaanId: t.pekerjaanId,
    tahap: t.tahap,
    kategori: t.kategori,
    subkategori: t.subkategori,
    noInvoice: t.noInvoice,
});

// Terbaru di atas
export const terbaruDulu = (a: TransaksiDb, b: TransaksiDb) =>
    a.tanggal.getTime() === b.tanggal.getTime() ? b.id - a.id : b.tanggal.getTime() - a.tanggal.getTime();

// Angka turunan 1 pekerjaan dari transaksinya. Pencairan SP2D = transaksi dana masuk yang punya tahap.
export function olahPekerjaan(pk: PekerjaanDb, semuaTrx: TransaksiDb[], denganTransaksi = false) {
    const trx = semuaTrx.filter((t) => t.pekerjaanId === pk.id);
    const sp2d = hitungSp2d(pk.nilaiKontrak, pk.persenPotongan);

    const pencairan = TAHAP.map((tahap) => {
        const isi = trx.filter((t) => t.tahap === tahap);
        const realisasi = jumlahkan(isi);
        const tanggalTerakhir = isi.map((t) => tglKeString(t.tanggal)).sort().at(-1);
        return {
            tahap,
            label: LABEL_TAHAP[tahap],
            realisasi: num(realisasi),
            status: realisasi.gt(0) ? "DONE" : "BELUM",
            tglPencairan: tanggalTerakhir ?? null,
            jumlah: isi.length,
        };
    });

    const cair = pencairan.reduce((s, x) => s.plus(x.realisasi), D(0));
    const masuk = jumlahkan(trx.filter((t) => t.arah === "MASUK"));
    const keluar = jumlahkan(trx.filter((t) => t.arah === "KELUAR"));

    return {
        id: pk.id,
        nama: pk.nama,
        kontrakInaproc: pk.kontrakInaproc,
        nomorKontrak: pk.nomorKontrak,
        tglKontrak: tglKeString(pk.tglKontrak),
        nilaiKontrak: num(pk.nilaiKontrak),
        persenPotongan: num(pk.persenPotongan),
        projectId: pk.projectId,
        sp2d: num(sp2d),
        pencairan,
        cair: num(cair),
        belumCair: num(Prisma.Decimal.max(sp2d.minus(cair), 0)),
        selesai: sp2d.gt(0) && sp2d.minus(cair).lt(1),
        danaMasuk: num(masuk),
        danaKeluar: num(keluar),
        saldo: num(masuk.minus(keluar)),
        jumlahTransaksi: trx.length,
        ...(denganTransaksi && { transaksi: [...trx].sort(terbaruDulu).map(bentukTransaksi) }),
    };
}

export function olahProject(
    p: { id: number; nama: string; pekerjaan: PekerjaanDb[] },
    semuaTrx: TransaksiDb[],
    denganTransaksi = false,
) {
    const pekerjaan = p.pekerjaan.map((pk) => olahPekerjaan(pk, semuaTrx, denganTransaksi));
    type Kunci = "nilaiKontrak" | "sp2d" | "cair" | "belumCair" | "danaMasuk" | "danaKeluar" | "saldo" | "jumlahTransaksi";
    const total = (k: Kunci) => num(pekerjaan.reduce((s, x) => s.plus(x[k]), D(0)));

    return {
        id: p.id,
        nama: p.nama,
        pekerjaan,
        nilaiKontrak: total("nilaiKontrak"),
        sp2d: total("sp2d"),
        cair: total("cair"),
        belumCair: total("belumCair"),
        danaMasuk: total("danaMasuk"),
        danaKeluar: total("danaKeluar"),
        saldo: total("saldo"),
        jumlahTransaksi: total("jumlahTransaksi"),
        selesai: pekerjaan.length > 0 && pekerjaan.every((x) => x.selesai),
    };
}
