/**
 * Satu daftar transaksi untuk rekening global (giro) dan kas.
 * Transaksi project terhubung ke pekerjaan dan tahap pencairan; transaksi operasional ke jenis operasional.
 * Aturan (batas SP2D, kas hanya keluar, dst) diperiksa di server.
 */
import { http } from './client';

export const REKENING = [
  { id: 'GIRO', nama: 'Rekening Global (Giro)' },
  { id: 'KAS', nama: 'Kas' },
];
export const namaRekening = (id) => REKENING.find((r) => r.id === id)?.nama || id;

const kirim = (d) => ({
  tanggal: d.tanggal,
  rekening: d.rekening,
  keterangan: d.keterangan,
  arah: d.arah,
  nominal: d.nominal === '' ? NaN : Number(d.nominal),
  klasifikasi: d.klasifikasi,
  projectId: d.projectId || null,
  pekerjaanId: d.pekerjaanId || null,
  tahap: d.tahap || null,
  kategori: d.kategori,
  subkategori: d.subkategori,
  noInvoice: d.noInvoice,
});

/** Urut lama ke baru; saldo berjalan hanya untuk rekening giro. */
export const listTransaksi = () => http('/transaksi');
export const getTransaksi = (id) => http(`/transaksi/${Number(id)}`);
export const listKategori = () => http('/transaksi/kategori');
export const createTransaksi = (data) => http('/transaksi', { method: 'POST', body: kirim(data) });
export const updateTransaksi = (id, data) => http(`/transaksi/${Number(id)}`, { method: 'PUT', body: kirim(data) });
export const deleteTransaksi = (id) => http(`/transaksi/${Number(id)}`, { method: 'DELETE' });
