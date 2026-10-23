
import { hitungSp2d } from '../utils/sp2d';
import { jumlahTransaksiProject } from './transaksi.api';

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const gagal = (status, message) => Object.assign(new Error(message), { status });

export const TAHAP = [
  { key: 'UM', label: 'Uang muka' },
  { key: 'TERMIN_1', label: 'Termin I' },
  { key: 'TERMIN_2', label: 'Termin II' },
  { key: 'TERMIN_3', label: 'Termin III' },
  { key: 'RETENSI', label: 'Retensi' },
];

let groups = [
  { id: 1, nama: 'PROJECT BPTD III SULBAR' },
  { id: 2, nama: 'PROJECT BPTD II PAPUA BARAT' },
];

// kodeProject hanyalah contoh
let projects = [
  { id: 1, groupId: 1, kodeProject: 'SBR-DEL', namaProject: 'BPTD SULBAR III (Delinator)', kontrakInaproc: 'EP-01KFM8WRD8A7T05J38YSN5R684', nomorKontrak: '', tglKontrak: '', paketPekerjaan: 'DELINATOR', nilaiKontrak: 750000000, ppnPersen: 11, pphPersen: 1.75, pekerjaan: ['PEKERJAAN BORONGAN PROJECT SULBAR DELINATOR'] },
  { id: 2, groupId: 2, kodeProject: 'PBR-APJ1', namaProject: 'BPTD II Papua Barat (APJ 1)', kontrakInaproc: 'EP-01KFMBB95JY5PQHX0DWKDC711N', nomorKontrak: '', tglKontrak: '', paketPekerjaan: 'APJ', nilaiKontrak: 0, ppnPersen: 11, pphPersen: 1.75, pekerjaan: [] },
  { id: 3, groupId: 2, kodeProject: 'PBR-APJ2', namaProject: 'BPTD II Papua Barat (APJ 2)', kontrakInaproc: 'EP-01KFMBATEKBAWXT0YPY10Q68EB', nomorKontrak: '', tglKontrak: '', paketPekerjaan: 'APJ', nilaiKontrak: 0, ppnPersen: 11, pphPersen: 1.75, pekerjaan: [] },
];

let pembayaran = {
  1: { UM: { realisasi: 200000000, status: 'DONE', tglPencairan: '2026-10-12', transaksiRef: 'UM-1 · 12 Okt 2026' } },
};

let nextId = 4;

const hitungRealisasi = (id) => Object.values(pembayaran[id] || {}).reduce((s, p) => s + (p.realisasi || 0), 0);
const lengkapi = (p) => {
  const sp2dNilai = hitungSp2d(p.nilaiKontrak, p.ppnPersen, p.pphPersen);
  const realisasiTotal = hitungRealisasi(p.id);
  return { ...p, sp2dNilai, realisasiTotal, sp2dBelumMasuk: sp2dNilai - realisasiTotal, jumlahTransaksi: jumlahTransaksiProject(p.id) };
};

export async function listGroups() { await delay(100); return groups; }
export async function listProject() { await delay(); return projects.map(lengkapi); }

export async function getProject(id) {
  await delay(120);
  const p = projects.find((x) => x.id === id);
  if (!p) throw gagal(404, 'Project tidak ditemukan.');
  return lengkapi(p);
}

export async function getPembayaran(projectId) {
  await delay(150);
  return TAHAP.map((t) => ({
    tahap: t.key, label: t.label, realisasi: 0, status: 'BELUM', tglPencairan: null, transaksiRef: null,
    ...(pembayaran[projectId]?.[t.key] || {}),
  }));
}

function cekDuplikat(data, selfId) {
  const kembar = projects.find((p) => p.id !== selfId && (p.kodeProject === data.kodeProject || p.namaProject === data.namaProject));
  if (kembar) throw gagal(409, 'Kode project atau nama project sudah dipakai project lain.');
}

export async function createProject(data) {
  await delay();
  cekDuplikat(data);
  const baru = { ...data, id: nextId++ };
  projects = [...projects, baru];
  return lengkapi(baru);
}

export async function updateProject(id, data) {
  await delay();
  cekDuplikat(data, id);
  projects = projects.map((p) => (p.id === id ? { ...p, ...data } : p));
  return lengkapi(projects.find((p) => p.id === id));
}

export async function deleteProject(id) {
  await delay();
  if (jumlahTransaksiProject(id) > 0) throw gagal(409, 'Project masih punya transaksi.');
  projects = projects.filter((x) => x.id !== id);
}