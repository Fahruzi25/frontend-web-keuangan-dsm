
import { listGroups, listProject } from './project.api';
import { daftarAkun, semuaTransaksi } from './transaksi.api';

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const jumlah = (arr) => arr.reduce((s, t) => s + t.nominal, 0);
const namaAkun = (id) => daftarAkun().find((a) => a.id === id)?.nama || '';

function baris(p, tx) {
  const milik = tx.filter((t) => t.projectId === p.id);
  const danaMasuk = jumlah(milik.filter((t) => t.arah === 'MASUK' && t.alokasi === 'PROJECT'));
  const danaKeluar = jumlah(milik.filter((t) => t.arah === 'KELUAR'));
  return { projectId: p.id, groupId: p.groupId, namaProject: p.namaProject, sp2d: p.sp2dNilai, danaMasuk, danaKeluar, saldo: danaMasuk - danaKeluar, sp2dBelumMasuk: p.sp2dBelumMasuk };
}

export async function rekapProject() {
  const [groups, projects] = await Promise.all([listGroups(), listProject()]);
  const tx = semuaTransaksi();
  const rows = projects.map((p) => baris(p, tx));
  return groups.map((g) => ({ ...g, rows: rows.filter((r) => r.groupId === g.id) })).filter((g) => g.rows.length);
}

/** Ringkasan satu project beserta transaksi dan jenis pekerjaannya. null bila project tidak ada. */
export async function detailProject(projectId) {
  await delay(150);
  const projects = await listProject();
  const p = projects.find((x) => x.id === projectId);
  if (!p) return null;
  const tx = semuaTransaksi();
  return {
    ringkasan: baris(p, tx),
    transaksi: tx.filter((t) => t.projectId === projectId).map((t) => ({
      id: t.id, tanggal: t.tanggal, keterangan: t.keterangan, pekerjaan: t.pekerjaan, alokasi: t.alokasi,
      arah: t.arah, nominal: t.nominal, rekening: namaAkun(t.accountId),
    })),
  };
}

/** bulan: "" (semua) atau "01".."12". Tiap baris membawa daftar transaksinya agar halaman detail tidak butuh panggilan lagi. */
export async function rekapOperasional({ bulan = '' } = {}) {
  await delay();
  const tx = semuaTransaksi().filter((t) => t.klasifikasi === 'OPERASIONAL' && t.arah === 'KELUAR' && (!bulan || t.tanggal.slice(5, 7) === bulan));
  const peta = new Map();
  tx.forEach((t) => {
    const key = `${t.kategori}||${t.subkategori}`;
    if (!peta.has(key)) peta.set(key, { key, kategori: t.kategori, subkategori: t.subkategori, transaksi: [] });
    peta.get(key).transaksi.push({ id: t.id, tanggal: t.tanggal, keterangan: t.keterangan, rekening: namaAkun(t.accountId), nominal: t.nominal });
  });
  return [...peta.values()]
    .map((r) => ({ ...r, jumlah: r.transaksi.length, total: jumlah(r.transaksi) }))
    .sort((a, b) => b.total - a.total);
}