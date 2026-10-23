import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import * as api from '../../api/transaksi.api';
import { listProject } from '../../api/project.api';
import { formatAngka, formatRupiah, formatTanggal } from '../../utils/format';
import { OPSI_BULAN } from '../../utils/bulan';

const PER_HALAMAN = 25;
const FILTER_AWAL = { bulan: '', klasifikasi: '', projectId: '', q: '' };

export default function GiroPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState(FILTER_AWAL);
  const [halaman, setHalaman] = useState(1);
  const [konfirmasi, setKonfirmasi] = useState(null);
  const [aksiError, setAksiError] = useState('');
  const [pesan, setPesan] = useState(location.state?.pesan || '');

  const akunId = accounts.length ? Number(params.get('rekening')) || accounts[0].id : null;

  // Pesan sukses dari halaman form hanya ditampilkan sekali
  useEffect(() => {
    if (location.state?.pesan) navigate(location.pathname + location.search, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let batal = false;
    Promise.all([api.listAccounts(), listProject()])
      .then(([a, p]) => { if (!batal) { setAccounts(a); setProjects(p); } })
      .catch(() => { if (!batal) { setLoadError('Data awal belum bisa dimuat. Muat ulang halaman.'); setLoading(false); } });
    return () => { batal = true; };
  }, []);

  const muat = useCallback(async (id) => {
    setLoading(true);
    setLoadError('');
    try {
      setData(await api.listTransaksi(id));
    } catch {
      setLoadError('Transaksi belum bisa dimuat. Periksa koneksi, lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (akunId) muat(akunId); }, [akunId, muat]);

  const namaProject = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p.namaProject])), [projects]);
  const global = data?.akun.tipe === 'GLOBAL';

  const ringkas = useMemo(() => {
    const rows = data?.rows || [];
    const jumlah = (arah) => rows.filter((t) => t.arah === arah).reduce((s, t) => s + t.nominal, 0);
    return { masuk: jumlah('MASUK'), keluar: jumlah('KELUAR') };
  }, [data]);

  const tersaring = useMemo(() => {
    if (!data) return [];
    const q = filter.q.trim().toLowerCase();
    return data.rows
      .filter((t) =>
        (!filter.bulan || t.tanggal.slice(5, 7) === filter.bulan) &&
        (!filter.klasifikasi || t.klasifikasi === filter.klasifikasi) &&
        (!filter.projectId || t.projectId === Number(filter.projectId)) &&
        (!q || [t.keterangan, t.noInvoice, t.subkategori].some((v) => (v || '').toLowerCase().includes(q))))
      .reverse(); // terbaru di atas; saldo tetap saldo berjalan aslinya
  }, [data, filter]);

  const jumlahHalaman = Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN));
  const halamanAktif = Math.min(halaman, jumlahHalaman);
  const tampil = tersaring.slice((halamanAktif - 1) * PER_HALAMAN, halamanAktif * PER_HALAMAN);
  const kolom = global ? 9 : 7;

  const ubahFilter = (e) => { setFilter((f) => ({ ...f, [e.target.name]: e.target.value })); setHalaman(1); };
  const pilihAkun = (id) => { setParams({ rekening: String(id) }); setFilter(FILTER_AWAL); setHalaman(1); setKonfirmasi(null); };

  async function hapus(t) {
    setAksiError('');
    try {
      await api.deleteTransaksi(t.id);
      setKonfirmasi(null);
      setPesan(`Transaksi "${t.keterangan}" dihapus dan saldo dihitung ulang.`);
      await muat(akunId);
    } catch (err) {
      setAksiError(err.message || 'Transaksi belum bisa dihapus. Coba lagi.');
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Rekening Koran Giro"
        hint={`Saldo dihitung otomatis dari saldo awal ${data ? formatRupiah(data.saldoAwal) : '…'}`}
        actions={akunId && <Link className="btn btn-primary" to={`/giro/tambah?rekening=${akunId}`}>Tambah transaksi</Link>}
      />

      {pesan && <p role="status" className="notice notice-ok">{pesan}<button type="button" className="btn btn-sm" onClick={() => setPesan('')}>Tutup</button></p>}
      {aksiError && <p role="alert" className="notice notice-danger">{aksiError}<button type="button" className="btn btn-sm" onClick={() => setAksiError('')}>Tutup</button></p>}

      <div className="seg" role="group" aria-label="Pilih rekening">
        {accounts.map((a) => (
          <button key={a.id} type="button" aria-pressed={a.id === akunId} onClick={() => pilihAkun(a.id)}>{a.nama}</button>
        ))}
      </div>

      <dl className="ledger">
        {global && <div><dt>Saldo giro</dt><dd>{formatRupiah(data?.saldoAkhir)}</dd></div>}
        {global && <div><dt>Total dana masuk</dt><dd>{formatRupiah(ringkas.masuk)}</dd></div>}
        <div><dt>{global ? 'Total dana keluar' : 'Total dana keluar (kas)'}</dt><dd>{formatRupiah(ringkas.keluar)}</dd></div>
      </dl>

      <div className="toolbar">
        <div className="field">
          <label htmlFor="f-bulan">Bulan</label>
          <select id="f-bulan" name="bulan" value={filter.bulan} onChange={ubahFilter}>
            <option value="">Semua bulan</option>
            {OPSI_BULAN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-klas">Klasifikasi</label>
          <select id="f-klas" name="klasifikasi" value={filter.klasifikasi} onChange={ubahFilter}>
            <option value="">Semua</option>
            <option value="PROJECT">Project</option>
            <option value="OPERASIONAL">Operasional</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-project">Project</label>
          <select id="f-project" name="projectId" value={filter.projectId} onChange={ubahFilter}>
            <option value="">Semua project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.namaProject}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="f-q">Cari</label>
          <input id="f-q" name="q" type="search" value={filter.q} onChange={ubahFilter} placeholder="Keterangan, subkategori, invoice" />
        </div>
      </div>

      {loadError && (
        <p role="alert" className="notice notice-danger">
          {loadError}
          {akunId && <button type="button" className="btn btn-sm" onClick={() => muat(akunId)}>Muat ulang</button>}
        </p>
      )}

      <section className="panel" aria-label="Daftar transaksi">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Tanggal</th>
              <th scope="col">Transaksi</th>
              <th scope="col">Kategori</th>
              <th scope="col">Project</th>
              <th scope="col">Invoice</th>
              {global && <th scope="col" className="num">Dana masuk</th>}
              <th scope="col" className="num">{global ? 'Dana keluar' : 'Dana keluar (kas)'}</th>
              {global && <th scope="col" className="num">Saldo</th>}
              <th scope="col"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={kolom} className="empty">Memuat transaksi…</td></tr>}
            {!loading && tampil.length === 0 && (
              <tr><td colSpan={kolom} className="empty">
                {data?.rows.length ? 'Tidak ada transaksi yang cocok dengan filter.' : 'Belum ada transaksi di rekening ini. Pilih Tambah transaksi untuk mencatat yang pertama.'}
              </td></tr>
            )}
            {!loading && tampil.map((t) => (
              <tr key={t.id}>
                <td data-label="Tanggal" className="tgl">{formatTanggal(t.tanggal)}</td>
                <td data-label="Transaksi">{t.keterangan}</td>
                <td data-label="Kategori"><span>{t.klasifikasi === 'PROJECT' ? 'Project' : 'Operasional'}{t.subkategori && <small>{t.subkategori}</small>}</span></td>
                <td data-label="Project"><span>{t.projectId ? namaProject[t.projectId] : '—'}{t.alokasi === 'DONASI' && <small>Donasi</small>}</span></td>
                <td data-label="Invoice">{t.noInvoice || '—'}</td>
                {global && <td data-label="Dana masuk" className="num">{t.arah === 'MASUK' ? formatAngka(t.nominal) : '—'}</td>}
                <td data-label={global ? 'Dana keluar' : 'Dana keluar (kas)'} className="num">{t.arah === 'KELUAR' ? formatAngka(t.nominal) : '—'}</td>
                {global && <td data-label="Saldo" className={`num${t.saldo < 0 ? ' neg' : ''}`}>{formatAngka(t.saldo)}</td>}
                <td className="aksi-cell">
                  <div className="aksi">
                    {konfirmasi === t.id ? (
                      <>
                        <button type="button" className="btn btn-sm" autoFocus onClick={() => setKonfirmasi(null)}>Batal</button>
                        <button type="button" className="btn btn-sm btn-danger solid" aria-label={`Ya, hapus transaksi ${t.keterangan}`} onClick={() => hapus(t)}>Ya, hapus</button>
                      </>
                    ) : (
                      <>
                        <Link className="btn btn-sm" to={`/giro/${t.id}/ubah?rekening=${akunId}`} aria-label={`Ubah transaksi ${t.keterangan}`}>Ubah</Link>
                        <button type="button" className="btn btn-sm btn-danger" aria-label={`Hapus transaksi ${t.keterangan}`} onClick={() => setKonfirmasi(t.id)}>Hapus</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {konfirmasi && <p role="status" className="sr-only">Konfirmasi hapus transaksi. Pilih Ya, hapus atau Batal.</p>}
      </section>

      <div className="pager">
        <span className="hint">{tersaring.length} transaksi</span>
        <div>
          <button type="button" className="btn btn-sm" disabled={halamanAktif <= 1} onClick={() => setHalaman(halamanAktif - 1)}>Sebelumnya</button>
          <span className="hint">Halaman {halamanAktif} dari {jumlahHalaman}</span>
          <button type="button" className="btn btn-sm" disabled={halamanAktif >= jumlahHalaman} onClick={() => setHalaman(halamanAktif + 1)}>Berikutnya</button>
        </div>
      </div>
    </div>
  );
}