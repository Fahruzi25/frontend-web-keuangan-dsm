// Uji integrasi API. Jalankan dengan database KHUSUS uji (nama database harus berakhiran "_test"),
// karena tabel project, pekerjaan, dan transaksi dikosongkan di awal.
//   DATABASE_URL="postgresql://...@localhost:5432/keuangan_dsm_test" JWT_SECRET="<32+ karakter>" npm test
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import bcrypt from "bcryptjs";

if (!/_test(\?|$)/.test(process.env.DATABASE_URL?.split("?")[0] ?? "") && !/_test\?/.test(process.env.DATABASE_URL ?? "")) {
    console.error('Tolak menjalankan uji: nama database di DATABASE_URL harus berakhiran "_test".');
    process.exit(1);
}

const { app } = await import("../src/app");
const { prisma } = await import("../src/lib/prisma");

let base = "";
let token = "";
let server: ReturnType<typeof app.listen>;

async function api(method: string, path: string, body?: unknown, tok: string | null = token) {
    const res = await fetch(`${base}/api${path}`, {
        method,
        headers: { ...(body !== undefined && { "Content-Type": "application/json" }), ...(tok && { Authorization: `Bearer ${tok}` }) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

const pekerjaan = (o: Record<string, unknown> = {}) => ({
    nama: "Delinator", kontrakInaproc: "EP-001", nomorKontrak: "", tglKontrak: "2026-08-15",
    nilaiKontrak: "750000000", persenPotongan: "1,75", ...o,
});

before(async () => {
    await prisma.transaksi.deleteMany();
    await prisma.pekerjaan.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { username: "uji" } });
    await prisma.user.create({ data: { username: "uji", password: await bcrypt.hash("password-uji-123", 10) } });
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
    await prisma.transaksi.deleteMany();
    await prisma.pekerjaan.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { username: "uji" } });
    server.close();
    await prisma.$disconnect();
});

describe("auth", () => {
    test("kesehatan server dan database", async () => {
        const r = await api("GET", "/health", undefined, null);
        assert.equal(r.status, 200);
    });
    test("tanpa token ditolak", async () => {
        for (const p of ["/project", "/transaksi", "/operasional", "/dashboard", "/auth/me"]) {
            assert.equal((await api("GET", p, undefined, null)).status, 401, p);
        }
    });
    test("login salah ditolak, pesan sama untuk username tak dikenal", async () => {
        const a = await api("POST", "/auth/login", { username: "uji", password: "salah" }, null);
        const b = await api("POST", "/auth/login", { username: "tidakada", password: "salah" }, null);
        assert.equal(a.status, 401);
        assert.equal(b.status, 401);
        assert.equal(a.data.message, b.data.message);
    });
    test("login kosong 422, token palsu 401", async () => {
        assert.equal((await api("POST", "/auth/login", {}, null)).status, 422);
        assert.equal((await api("GET", "/project", undefined, "abc.def.ghi")).status, 401);
    });
    test("login benar, /me berjalan", async () => {
        const r = await api("POST", "/auth/login", { username: "uji", password: "password-uji-123" }, null);
        assert.equal(r.status, 200);
        assert.ok(r.data.token);
        assert.equal(r.data.user.username, "uji");
        assert.equal(r.data.user.password, undefined);
        token = r.data.token;
        assert.equal((await api("GET", "/auth/me")).data.username, "uji");
    });
});

describe("project", () => {
    let projectId = 0;
    let pekerjaanId = 0;

    test("database kosong", async () => {
        assert.deepEqual((await api("GET", "/project")).data, []);
        const t = (await api("GET", "/transaksi")).data;
        assert.deepEqual(t.rows, []);
        assert.equal(t.ringkasan.saldoGiro, 0);
    });

    test("validasi: nama kosong, tanpa pekerjaan, persen salah", async () => {
        const a = await api("POST", "/project", { nama: "", pekerjaan: [] });
        assert.equal(a.status, 422);
        const b = await api("POST", "/project", { nama: "X", pekerjaan: [pekerjaan({ persenPotongan: "abc" }), pekerjaan({ kontrakInaproc: "EP-9", persenPotongan: "101" })] });
        assert.equal(b.status, 422);
        assert.ok(b.data.errors.some((e: string) => e.startsWith("Pekerjaan 1:")));
        assert.ok(b.data.errors.some((e: string) => e.startsWith("Pekerjaan 2:")));
    });

    test("buat project; persen diketik '1,75' dan SP2D dihitung benar", async () => {
        const r = await api("POST", "/project", { nama: "PROJECT UJI", pekerjaan: [pekerjaan()] });
        assert.equal(r.status, 201);
        projectId = r.data.id;
        pekerjaanId = r.data.pekerjaan[0].id;
        assert.equal(r.data.pekerjaan[0].persenPotongan, 1.75);
        assert.equal(r.data.pekerjaan[0].sp2d, 663851351.35);
        assert.equal(r.data.pekerjaan[0].belumCair, 663851351.35);
        assert.equal(r.data.pekerjaan[0].pencairan.length, 5);
    });

    test("nama dan kontrak kembar ditolak", async () => {
        const a = await api("POST", "/project", { nama: "project uji", pekerjaan: [pekerjaan({ kontrakInaproc: "EP-2" })] });
        assert.equal(a.status, 422);
        assert.ok(a.data.errors.includes("Nama project sudah dipakai."));
        const b = await api("POST", "/project", { nama: "Lain", pekerjaan: [pekerjaan({ kontrakInaproc: "ep-001" })] });
        assert.equal(b.status, 422);
        const c = await api("POST", "/project", { nama: "Lain", pekerjaan: [pekerjaan({ kontrakInaproc: "EP-5" }), pekerjaan({ kontrakInaproc: "ep-5" })] });
        assert.equal(c.status, 422);
    });

    test("ubah project: tambah pekerjaan dengan tarif lain", async () => {
        const r = await api("PUT", `/project/${projectId}`, {
            nama: "PROJECT UJI",
            pekerjaan: [{ id: pekerjaanId, ...pekerjaan() }, pekerjaan({ nama: "APJ", kontrakInaproc: "EP-002", nilaiKontrak: 300000000, persenPotongan: 1.5 })],
        });
        assert.equal(r.status, 200);
        assert.equal(r.data.pekerjaan.length, 2);
        assert.equal(r.data.pekerjaan[1].sp2d, 266216216.22); // 300 jt / 1,11, dikurangi 1,5%
        assert.equal(r.data.pekerjaan[1].persenPotongan, 1.5);
    });

    test("pekerjaan milik project lain ditolak", async () => {
        const r = await api("PUT", `/project/${projectId}`, { nama: "PROJECT UJI", pekerjaan: [pekerjaan({ id: 999999 })] });
        assert.equal(r.status, 422);
    });

    test("id tidak valid 400, tidak ada 404", async () => {
        assert.equal((await api("GET", "/project/abc")).status, 400);
        assert.equal((await api("GET", "/project/999999")).status, 404);
        assert.equal((await api("DELETE", "/project/999999")).status, 404);
    });

    describe("transaksi", () => {
        const dasar = { tanggal: "2026-10-01", rekening: "GIRO", keterangan: "SALDO AWAL", arah: "MASUK", nominal: "4000000000", klasifikasi: "OPERASIONAL", subkategori: "Saldo" };
        let idTahap = 0;

        test("validasi dasar", async () => {
            assert.equal((await api("POST", "/transaksi", { ...dasar, nominal: 0 })).status, 422);
            assert.equal((await api("POST", "/transaksi", { ...dasar, tanggal: "2026-02-30" })).status, 422);
            assert.equal((await api("POST", "/transaksi", { ...dasar, keterangan: "  " })).status, 422);
            assert.equal((await api("POST", "/transaksi", { ...dasar, subkategori: "" })).status, 422);
            assert.equal((await api("POST", "/transaksi", { ...dasar, rekening: "KAS" })).status, 422); // kas hanya keluar
            assert.equal((await api("POST", "/transaksi", { ...dasar, klasifikasi: "PROJECT" })).status, 422); // tanpa project
        });

        test("buat transaksi operasional dan project", async () => {
            assert.equal((await api("POST", "/transaksi", dasar)).status, 201);
            const gaji = await api("POST", "/transaksi", { ...dasar, keterangan: "Gaji", arah: "KELUAR", nominal: 7000000, kategori: "Pegawai", subkategori: "Gaji Karyawan", tanggal: "2026-10-05" });
            assert.equal(gaji.status, 201);
            assert.equal(gaji.data.projectId, null);
            const kas = await api("POST", "/transaksi", { ...dasar, keterangan: "Listrik", rekening: "KAS", arah: "KELUAR", nominal: 1800000, subkategori: "PLN", tanggal: "2026-10-20" });
            assert.equal(kas.status, 201);
            const um = await api("POST", "/transaksi", {
                tanggal: "2026-10-12", rekening: "GIRO", keterangan: "UM-1", arah: "MASUK", nominal: 200000000,
                klasifikasi: "PROJECT", projectId: String(projectId), pekerjaanId: String(pekerjaanId), tahap: "UANG_MUKA", kategori: "harus dibuang",
            });
            assert.equal(um.status, 201);
            idTahap = um.data.id;
            assert.equal(um.data.kategori, null);
            assert.equal(um.data.namaProject, "PROJECT UJI");
            assert.equal(um.data.namaPekerjaan, "Delinator");
        });

        test("pekerjaan harus milik project yang dipilih", async () => {
            const p2 = await api("POST", "/project", { nama: "PROJECT DUA", pekerjaan: [pekerjaan({ kontrakInaproc: "EP-77" })] });
            const r = await api("POST", "/transaksi", { ...dasar, klasifikasi: "PROJECT", projectId: p2.data.id, pekerjaanId: pekerjaanId, subkategori: null });
            assert.equal(r.status, 422);
            await api("DELETE", `/project/${p2.data.id}`);
        });

        test("pencairan melebihi SP2D ditolak, sisanya diterima", async () => {
            const lebih = await api("POST", "/transaksi", { tanggal: "2026-10-13", rekening: "GIRO", keterangan: "T1", arah: "MASUK", nominal: 500000000, klasifikasi: "PROJECT", projectId, pekerjaanId, tahap: "TERMIN_1" });
            assert.equal(lebih.status, 422);
            assert.match(lebih.data.message, /melebihi SP2D/);
            const pas = await api("POST", "/transaksi", { tanggal: "2026-10-13", rekening: "GIRO", keterangan: "T1", arah: "MASUK", nominal: 463851351.35, klasifikasi: "PROJECT", projectId, pekerjaanId, tahap: "TERMIN_1" });
            assert.equal(pas.status, 201);
            const d = (await api("GET", `/project/${projectId}`)).data;
            assert.equal(d.pekerjaan[0].selesai, true);
            assert.equal(d.pekerjaan[0].cair, 663851351.35);
            assert.equal(d.pekerjaan[0].belumCair, 0);
            assert.equal(d.pekerjaan[0].transaksi.length, 2);
            await api("DELETE", `/transaksi/${pas.data.id}`);
        });

        test("pencairan bersamaan tidak bisa menembus batas SP2D", async () => {
            // sisa SP2D = 463.851.351,35 ; dua pencairan 300 juta sekaligus, hanya satu yang boleh lolos
            const kirim = () => api("POST", "/transaksi", { tanggal: "2026-10-14", rekening: "GIRO", keterangan: "T2", arah: "MASUK", nominal: 300000000, klasifikasi: "PROJECT", projectId, pekerjaanId, tahap: "TERMIN_2" });
            const [a, b] = await Promise.all([kirim(), kirim()]);
            assert.deepEqual([a.status, b.status].sort(), [201, 422]);
            const baru = a.status === 201 ? a.data.id : b.data.id;
            await api("DELETE", `/transaksi/${baru}`);
        });

        test("ubah transaksi", async () => {
            const r = await api("PUT", `/transaksi/${idTahap}`, { tanggal: "2026-10-12", rekening: "GIRO", keterangan: "UM-1 revisi", arah: "MASUK", nominal: 150000000, klasifikasi: "PROJECT", projectId, pekerjaanId, tahap: "UANG_MUKA" });
            assert.equal(r.status, 200);
            assert.equal(r.data.keterangan, "UM-1 revisi");
            assert.equal((await api("PUT", "/transaksi/999999", dasar)).status, 404);
            // arah diubah jadi KELUAR: tahap otomatis dibuang
            const k = await api("PUT", `/transaksi/${idTahap}`, { tanggal: "2026-10-12", rekening: "GIRO", keterangan: "x", arah: "KELUAR", nominal: 1000, klasifikasi: "PROJECT", projectId, pekerjaanId, tahap: "UANG_MUKA" });
            assert.equal(k.data.tahap, null);
            await api("PUT", `/transaksi/${idTahap}`, { tanggal: "2026-10-12", rekening: "GIRO", keterangan: "UM-1", arah: "MASUK", nominal: 200000000, klasifikasi: "PROJECT", projectId, pekerjaanId, tahap: "UANG_MUKA" });
        });

        test("daftar transaksi: saldo berjalan dan ringkasan", async () => {
            const { data } = await api("GET", "/transaksi");
            assert.equal(data.rows.length, 4);
            assert.deepEqual(data.rows.map((r: { tanggal: string }) => r.tanggal), ["2026-10-01", "2026-10-05", "2026-10-12", "2026-10-20"]);
            assert.equal(data.rows[0].saldo, 4000000000);
            assert.equal(data.rows[3].saldo, null); // kas tidak punya saldo giro
            assert.equal(data.ringkasan.saldoGiro, 4000000000 - 7000000 + 200000000);
            assert.equal(data.ringkasan.danaMasuk, 200000000); // saldo awal tidak dihitung
            assert.equal(data.ringkasan.keluarGiro, 7000000);
            assert.equal(data.ringkasan.keluarKas, 1800000);
        });

        test("kategori, operasional, dashboard", async () => {
            const k = (await api("GET", "/transaksi/kategori")).data;
            assert.deepEqual(k.subkategori, ["Gaji Karyawan", "PLN", "Saldo"]);
            assert.deepEqual(k.kategori, ["Pegawai"]);
            const op = (await api("GET", "/operasional")).data;
            assert.equal(op.length, 2);
            assert.equal(op[0].keterangan, "Listrik"); // terbaru di atas
            assert.equal(op[1].kategori, "Pegawai");
            assert.equal((await api("GET", "/operasional?bulan=11")).data.length, 0);
            assert.equal((await api("GET", "/operasional?bulan=13")).status, 422);
            const d = (await api("GET", "/dashboard")).data;
            assert.equal(d.saldoGiro, 4000000000 - 7000000 + 200000000);
            assert.equal(d.perBulan.length, 12);
            assert.equal(d.terbaru.length, 3); // saldo awal tidak ikut
            assert.equal(d.proyek.jumlahProject, 1);
            assert.equal(d.proyek.cair, 200000000);
        });

        test("project yang punya transaksi tidak bisa dihapus; pekerjaan dengan transaksi tidak bisa dibuang", async () => {
            const h = await api("DELETE", `/project/${projectId}`);
            assert.equal(h.status, 409);
            assert.match(h.data.message, /masih memiliki 1 transaksi/);
            const lama = (await api("GET", `/project/${projectId}`)).data.pekerjaan;
            const kedua = lama.find((k: { kontrakInaproc: string }) => k.kontrakInaproc === "EP-002");
            const b = await api("PUT", `/project/${projectId}`, { nama: "PROJECT UJI", pekerjaan: [{ id: kedua.id, ...pekerjaan({ kontrakInaproc: "EP-002", nama: "APJ" }) }] });
            assert.equal(b.status, 409); // pekerjaan pertama masih punya transaksi
            assert.match(b.data.message, /masih memiliki transaksi/);
        });

        test("SP2D tidak boleh diubah lebih kecil dari pencairan yang sudah ada", async () => {
            const r = await api("PUT", `/project/${projectId}`, { nama: "PROJECT UJI", pekerjaan: [{ id: pekerjaanId, ...pekerjaan({ nilaiKontrak: 100000000 }) }] });
            assert.equal(r.status, 422);
            assert.match(r.data.errors[0], /lebih kecil dari pencairan/);
        });

        test("hapus transaksi lalu project", async () => {
            const { data } = await api("GET", "/transaksi");
            for (const t of data.rows) assert.equal((await api("DELETE", `/transaksi/${t.id}`)).status, 200);
            assert.equal((await api("DELETE", "/transaksi/1")).status, 404);
            assert.equal((await api("DELETE", `/project/${projectId}`)).status, 200);
            assert.deepEqual((await api("GET", "/project")).data, []);
        });
    });
});

describe("keamanan", () => {
    test("JSON rusak 400, bodi terlalu besar 413, rute tak dikenal 404", async () => {
        const rusak = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bukan json" });
        assert.equal(rusak.status, 400);
        const besar = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "a".repeat(200_000) }) });
        assert.equal(besar.status, 413);
        assert.equal((await api("GET", "/tidak-ada")).status, 404);
    });
    test("header keamanan dan tanpa cache", async () => {
        const res = await fetch(`${base}/api/health`);
        assert.equal(res.headers.get("x-powered-by"), null);
        assert.equal(res.headers.get("x-content-type-options"), "nosniff");
        assert.equal(res.headers.get("cache-control"), "no-store");
    });
});
