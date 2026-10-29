/**
 * Project memiliki banyak pekerjaan; tiap pekerjaan punya nilai kontrak, SP2D, dan pencairan per tahap.
 * Semua angka turunan (SP2D, cair, sisa, saldo) dihitung di server dari transaksi.
 */
import { http } from './client';
import { bacaPersen } from '../utils/pajak';

export const TAHAP = [
  { key: 'UANG_MUKA', label: 'Uang muka' },
  { key: 'TERMIN_1', label: 'Termin I' },
  { key: 'TERMIN_2', label: 'Termin II' },
  { key: 'TERMIN_3', label: 'Termin III' },
  { key: 'RETENSI', label: 'Retensi' },
];
export const labelTahap = (key) => TAHAP.find((t) => t.key === key)?.label || key;

/** Data form menjadi isi permintaan. Persen pajak diketik pengguna ("1,75"), dikirim sebagai angka. */
const kirim = (data) => ({
  nama: String(data.nama ?? '').trim(),
  pekerjaan: (data.pekerjaan ?? []).map((k) => ({
    ...(k.id ? { id: Number(k.id) } : {}),
    nama: k.nama,
    kontrakInaproc: k.kontrakInaproc,
    nomorKontrak: k.nomorKontrak,
    tglKontrak: k.tglKontrak || null,
    nilaiKontrak: k.nilaiKontrak === '' ? NaN : Number(k.nilaiKontrak),
    persenPotongan: bacaPersen(k.persenPotongan),
  })),
});

export const listProject = () => http('/project');
export const getProject = (id) => http(`/project/${Number(id)}`);
export const createProject = (data) => http('/project', { method: 'POST', body: kirim(data) });
export const updateProject = (id, data) => http(`/project/${Number(id)}`, { method: 'PUT', body: kirim(data) });
export const deleteProject = (id) => http(`/project/${Number(id)}`, { method: 'DELETE' });
