import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import * as api from '../../api/project.api';
import { formatAngka, formatRupiah } from '../../utils/format';

export default function ProjectPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [konfirmasi, setKonfirmasi] = useState(null);
  const [aksiError, setAksiError] = useState('');
  const [pesan, setPesan] = useState(location.state?.pesan || '');

  useEffect(() => {
    if (location.state?.pesan) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const muat = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [g, p] = await Promise.all([api.listGroups(), api.listProject()]);
      setGroups(g);
      setProjects(p);
    } catch {
      setLoadError('Data project belum bisa dimuat. Periksa koneksi, lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { muat(); }, [muat]);

  const tersaring = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.namaProject, p.kodeProject, p.kontrakInaproc, p.paketPekerjaan].some((v) => (v || '').toLowerCase().includes(q)));
  }, [projects, query]);

  const total = useMemo(() => projects.reduce((t, p) => ({
    kontrak: t.kontrak + p.nilaiKontrak, sp2d: t.sp2d + p.sp2dNilai, belum: t.belum + p.sp2dBelumMasuk,
  }), { kontrak: 0, sp2d: 0, belum: 0 }), [projects]);

  function mintaHapus(p) {
    setAksiError('');
    if (p.jumlahTransaksi > 0) {
      setKonfirmasi(null);
      setAksiError(`${p.namaProject} masih punya ${p.jumlahTransaksi} transaksi di rekening koran. Hapus atau pindahkan transaksinya terlebih dahulu.`);
      return;
    }
    setKonfirmasi(p.id);
  }

  async function hapus(p) {
    try {
      await api.deleteProject(p.id);
      setKonfirmasi(null);
      setPesan(`Project "${p.namaProject}" dihapus.`);
      await muat();
    } catch (err) {
      setKonfirmasi(null);
      setAksiError(err.message || 'Project belum bisa dihapus. Coba lagi.');
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Project DSM 2026"
        hint={`${projects.length} project terdaftar`}
        actions={<Link className="btn btn-primary" to="/project/tambah">Tambah project</Link>}
      />

      {pesan && <p role="status" className="notice notice-ok">{pesan}<button type="button" className="btn btn-sm" onClick={() => setPesan('')}>Tutup</button></p>}
      {aksiError && <p role="alert" className="notice notice-danger">{aksiError}<button type="button" className="btn btn-sm" onClick={() => setAksiError('')}>Tutup</button></p>}

      <dl className="ledger">
        <div><dt>Nilai kontrak</dt><dd>{formatRupiah(total.kontrak)}</dd></div>
        <div><dt>SP2D</dt><dd>{formatRupiah(total.sp2d)}</dd></div>
        <div><dt>SP2D belum masuk</dt><dd>{formatRupiah(total.belum)}</dd></div>
      </dl>

      <div className="toolbar">
        <div className="field grow">
          <label htmlFor="cari">Cari project</label>
          <input id="cari" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nama, kode, paket, atau nomor EP" />
        </div>
      </div>

      {loadError && (
        <p role="alert" className="notice notice-danger">{loadError}<button type="button" className="btn btn-sm" onClick={muat}>Muat ulang</button></p>
      )}

      {loading && <p role="status" className="hint">Memuat project…</p>}
      {!loading && tersaring.length === 0 && (
        <section className="panel" aria-label="Daftar project">
          <p className="empty-note">
            {query ? 'Tidak ada project yang cocok dengan pencarian.' : 'Belum ada project. Pilih Tambah project untuk memulai.'}
          </p>
        </section>
      )}

      {!loading && groups.map((g) => {
        const isi = tersaring.filter((p) => p.groupId === g.id);
        if (!isi.length) return null;
        return (
          <section key={g.id} className="panel" aria-labelledby={`g${g.id}`}>
            <h2 id={`g${g.id}`} className="judul-panel">{g.nama}</h2>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Nama project</th>
                  <th scope="col">Kontrak INAPROC</th>
                  <th scope="col">Paket</th>
                  <th scope="col" className="num">Nilai kontrak</th>
                  <th scope="col" className="num">SP2D</th>
                  <th scope="col" className="num">Sudah cair</th>
                  <th scope="col" className="num">Belum masuk</th>
                  <th scope="col"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {isi.map((p) => (
                  <tr key={p.id}>
                    <th scope="row"><Link className="link" to={`/project/${p.id}`}>{p.namaProject}</Link></th>
                    <td data-label="Kontrak INAPROC" className="kontrak">{p.kontrakInaproc || '—'}</td>
                    <td data-label="Paket">{p.paketPekerjaan || '—'}</td>
                    <td data-label="Nilai kontrak" className="num">{formatAngka(p.nilaiKontrak)}</td>
                    <td data-label="SP2D" className="num">{formatAngka(p.sp2dNilai)}</td>
                    <td data-label="Sudah cair" className="num">{formatAngka(p.realisasiTotal)}</td>
                    <td data-label="Belum masuk" className="num">{formatAngka(p.sp2dBelumMasuk)}</td>
                    <td className="aksi-cell">
                      <div className="aksi">
                        {konfirmasi === p.id ? (
                          <>
                            <button type="button" className="btn btn-sm" autoFocus onClick={() => setKonfirmasi(null)}>Batal</button>
                            <button type="button" className="btn btn-sm btn-danger solid" aria-label={`Ya, hapus project ${p.namaProject}`} onClick={() => hapus(p)}>Ya, hapus</button>
                          </>
                        ) : (
                          <>
                            <Link className="btn btn-sm" to={`/project/${p.id}/ubah`} aria-label={`Ubah project ${p.namaProject}`}>Ubah</Link>
                            <button type="button" className="btn btn-sm btn-danger" aria-label={`Hapus project ${p.namaProject}`} onClick={() => mintaHapus(p)}>Hapus</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
      <p className="hint">SP2D = nilai kontrak ÷ (1 + PPN) × (1 − PPh), dihitung otomatis. Pilih nama project untuk melihat pencairannya.</p>
    </div>
  );
}