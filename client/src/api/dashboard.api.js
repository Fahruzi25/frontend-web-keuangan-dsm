
import { listProject } from './project.api';
import { daftarAkun, listTransaksi, semuaTransaksi } from './transaksi.api';

const jumlah = (arr) => arr.reduce((s, t) => s + t.nominal, 0);

export async function getDashboard() {
  const global = daftarAkun().find((a) => a.tipe === 'GLOBAL');
  const [{ saldoAkhir }, projects] = await Promise.all([listTransaksi(global.id), listProject()]);
  const tx = semuaTransaksi();
  const namaProject = Object.fromEntries(projects.map((p) => [p.id, p.namaProject]));

  const perBulan = Array.from({ length: 12 }, (_, i) => {
    const bln = String(i + 1).padStart(2, '0');
    const bulanIni = tx.filter((t) => t.tanggal.slice(5, 7) === bln);
    return { masuk: jumlah(bulanIni.filter((t) => t.arah === 'MASUK')), keluar: jumlah(bulanIni.filter((t) => t.arah === 'KELUAR')) };
  });

  return {
    saldoGiro: saldoAkhir,
    danaMasuk: jumlah(tx.filter((t) => t.arah === 'MASUK')),
    danaKeluar: jumlah(tx.filter((t) => t.arah === 'KELUAR')),
    jumlahProject: projects.length,
    perBulan,
    terbaru: [...tx].reverse().slice(0, 5).map((t) => ({ ...t, namaProject: namaProject[t.projectId] || null })),
  };
}
