
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const gagal = (status, message) => Object.assign(new Error(message), { status });

const ACCOUNTS = [
  { id: 1, kode: 'GIRO-DSM', nama: 'Rekening Global (Giro)', tipe: 'GLOBAL', saldoAwal: 4000000000 },
  { id: 2, kode: 'KAS', nama: 'Rekening Kas', tipe: 'KAS', saldoAwal: 0 },
];

const dasar = { alokasi: null, pekerjaan: null, noInvoice: '', deletedAt: null };
let transaksi = [
  { ...dasar, id: 1, accountId: 1, tanggal: '2026-10-12', keterangan: 'GAJI KARYAWAN', arah: 'KELUAR', nominal: 7000000, klasifikasi: 'OPERASIONAL', kategori: 'Operasional', subkategori: 'Gaji Karyawan', projectId: null },
  { ...dasar, id: 2, accountId: 1, tanggal: '2026-10-12', keterangan: 'PEKERJAAN BORONGAN PROJECT SULBAR DELINATOR', arah: 'KELUAR', nominal: 15000000, klasifikasi: 'PROJECT', kategori: null, subkategori: null, projectId: 1, alokasi: 'PROJECT', pekerjaan: 'PEKERJAAN BORONGAN PROJECT SULBAR DELINATOR' },
  { ...dasar, id: 3, accountId: 1, tanggal: '2026-10-12', keterangan: 'UM-1', arah: 'MASUK', nominal: 200000000, klasifikasi: 'PROJECT', kategori: null, subkategori: null, projectId: 1, alokasi: 'PROJECT' },
];
let nextId = 4;

const aktif = () => transaksi.filter((t) => !t.deletedAt);
const urut = (a, b) => a.tanggal.localeCompare(b.tanggal) || a.id - b.id;

/** Dipakai modul mock lain (rekap, dashboard, project). Server nyata: query agregat. */
export const semuaTransaksi = () => aktif().sort(urut);
export const jumlahTransaksiProject = (projectId) => aktif().filter((t) => t.projectId === projectId).length;
export const daftarAkun = () => ACCOUNTS;

export async function listAccounts() { await delay(80); return ACCOUNTS; }

export async function listKategori() {
  await delay(80);
  const kategori = new Set(['Operasional']);
  const subkategori = new Set();
  aktif().filter((t) => t.klasifikasi === 'OPERASIONAL').forEach((t) => { kategori.add(t.kategori); subkategori.add(t.subkategori); });
  return { kategori: [...kategori], subkategori: [...subkategori] };
}

export async function getTransaksi(id) {
  await delay(120);
  const t = aktif().find((x) => x.id === id);
  if (!t) throw gagal(404, 'Transaksi tidak ditemukan.');
  return t;
}

/** Saldo berjalan dihitung sebelum filter apa pun, sama seperti view v_saldo_giro. */
export async function listTransaksi(accountId) {
  await delay();
  const akun = ACCOUNTS.find((a) => a.id === accountId);
  const global = akun.tipe === 'GLOBAL';
  let saldo = akun.saldoAwal;
  const rows = aktif().sort(urut).filter((t) => t.accountId === accountId).map((t) => {
    if (global) saldo += t.arah === 'MASUK' ? t.nominal : -t.nominal;
    return { ...t, saldo: global ? saldo : null };
  });
  return { akun, rows, saldoAwal: akun.saldoAwal, saldoAkhir: global ? saldo : null };
}

function validasi(d) {
  const akun = ACCOUNTS.find((a) => a.id === Number(d.accountId));
  if (!akun) throw gagal(422, 'Rekening tidak ditemukan.');
  if (!d.tanggal) throw gagal(422, 'Tanggal wajib diisi.');
  if (!d.keterangan?.trim()) throw gagal(422, 'Keterangan wajib diisi.');
  if (!(Number(d.nominal) > 0)) throw gagal(422, 'Nominal harus lebih dari 0.');
  if (akun.tipe === 'KAS' && d.arah !== 'KELUAR') throw gagal(422, 'Rekening kas hanya untuk dana keluar.');
  if (d.klasifikasi === 'PROJECT' && !d.projectId) throw gagal(422, 'Pilih kode project untuk transaksi project.');
  if (d.klasifikasi === 'OPERASIONAL' && (!d.kategori?.trim() || !d.subkategori?.trim())) {
    throw gagal(422, 'Kategori dan subkategori wajib untuk transaksi operasional.');
  }
}

function rapikan(d) {
  const project = d.klasifikasi === 'PROJECT';
  return {
    accountId: Number(d.accountId), tanggal: d.tanggal, keterangan: d.keterangan.trim(), arah: d.arah,
    nominal: Number(d.nominal), klasifikasi: d.klasifikasi,
    kategori: project ? null : d.kategori.trim(), subkategori: project ? null : d.subkategori.trim(),
    projectId: project ? Number(d.projectId) : null, alokasi: project ? d.alokasi || 'PROJECT' : null,
    pekerjaan: project ? d.pekerjaan || null : null, noInvoice: (d.noInvoice || '').trim(),
  };
}

export async function createTransaksi(data) {
  await delay();
  validasi(data);
  const baru = { ...rapikan(data), id: nextId++, deletedAt: null };
  transaksi = [...transaksi, baru];
  return baru;
}

export async function updateTransaksi(id, data) {
  await delay();
  validasi(data);
  transaksi = transaksi.map((t) => (t.id === id ? { ...t, ...rapikan(data) } : t));
}

/** Soft delete: baris tetap ada, hanya ditandai. */
export async function deleteTransaksi(id) {
  await delay();
  transaksi = transaksi.map((t) => (t.id === id ? { ...t, deletedAt: new Date().toISOString() } : t));
}