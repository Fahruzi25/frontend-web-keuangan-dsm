import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rekapProject } from '../../api/rekap.api';
import { formatAngka } from '../../utils/format';

const kelasSaldo = (n) => `num${n < 0 ? ' neg' : ''}`;
const jumlah = (rows, key) => rows.reduce((s, r) => s + r[key], 0);

export default function RekapProjectTab() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');

  const muat = () => {
    setError('');
    rekapProject().then(setGroups).catch(() => setError('Rekap belum bisa dimuat. Periksa koneksi, lalu coba lagi.'));
  };
  useEffect(muat, []);

  return (
    <>
      <p className="hint">
        Dana masuk hanya menghitung alokasi project. Dana keluar menghitung giro dan kas, termasuk donasi. Pilih nama project untuk melihat detailnya.
      </p>

      {error && <p role="alert" className="notice notice-danger">{error}<button type="button" className="btn btn-sm" onClick={muat}>Muat ulang</button></p>}
      {!groups && !error && <p role="status" className="hint">Memuat rekap…</p>}
      {groups && groups.length === 0 && <p className="hint">Belum ada project. Tambahkan di menu Project DSM 2026.</p>}

      {groups && groups.map((g) => (
        <section key={g.id} className="panel" aria-labelledby={`g${g.id}`}>
          <h2 id={`g${g.id}`} className="judul-panel">{g.nama}</h2>
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col" className="num">SP2D</th>
                <th scope="col" className="num">Dana masuk</th>
                <th scope="col" className="num">Dana keluar</th>
                <th scope="col" className="num">Saldo</th>
                <th scope="col" className="num">SP2D belum masuk</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r.projectId}>
                  <th scope="row"><Link className="link" to={`/rekap/project/${r.projectId}`}>{r.namaProject}</Link></th>
                  <td data-label="SP2D" className="num">{formatAngka(r.sp2d)}</td>
                  <td data-label="Dana masuk" className="num">{formatAngka(r.danaMasuk)}</td>
                  <td data-label="Dana keluar" className="num">{formatAngka(r.danaKeluar)}</td>
                  <td data-label="Saldo" className={kelasSaldo(r.saldo)}>{formatAngka(r.saldo)}</td>
                  <td data-label="SP2D belum masuk" className="num">{formatAngka(r.sp2dBelumMasuk)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td data-label="SP2D" className="num">{formatAngka(jumlah(g.rows, 'sp2d'))}</td>
                <td data-label="Dana masuk" className="num">{formatAngka(jumlah(g.rows, 'danaMasuk'))}</td>
                <td data-label="Dana keluar" className="num">{formatAngka(jumlah(g.rows, 'danaKeluar'))}</td>
                <td data-label="Saldo" className={kelasSaldo(jumlah(g.rows, 'saldo'))}>{formatAngka(jumlah(g.rows, 'saldo'))}</td>
                <td data-label="SP2D belum masuk" className="num">{formatAngka(jumlah(g.rows, 'sp2dBelumMasuk'))}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      ))}
    </>
  );
}