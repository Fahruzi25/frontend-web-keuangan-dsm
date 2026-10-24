import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { rekapOperasional } from '../../api/rekap.api';
import { formatAngka, formatRupiah } from '../../utils/format';
import { OPSI_BULAN } from '../../utils/bulan';

export default function RekapOperasionalTab() {
  const [params, setParams] = useSearchParams();
  const bulan = params.get('bulan') || '';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const muat = () => {
    setError('');
    setRows(null);
    rekapOperasional({ bulan }).then(setRows).catch(() => setError('Rekap belum bisa dimuat. Periksa koneksi, lalu coba lagi.'));
  };
  useEffect(muat, [bulan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ubah bulan tanpa menghapus pilihan "tampilan" di alamat
  const ubahBulan = (nilai) => setParams((lama) => {
    const baru = new URLSearchParams(lama);
    if (nilai) baru.set('bulan', nilai); else baru.delete('bulan');
    return baru;
  });

  const total = useMemo(() => (rows || []).reduce((s, r) => s + r.total, 0), [rows]);
  const terbesar = rows?.[0] || null; // sudah diurutkan dari total terbesar
  const porsi = (n) => (total ? `${Math.round((n / total) * 100)}%` : '0%');
  const query = bulan ? `?bulan=${bulan}` : '';

  return (
    <>
      <p className="hint">
        Pengeluaran operasional dari rekening giro dan kas, dikelompokkan per subkategori. Pilih subkategori untuk melihat transaksinya.
      </p>

      <div className="toolbar">
        <div className="field">
          <label htmlFor="bulan">Bulan</label>
          <select id="bulan" value={bulan} onChange={(e) => ubahBulan(e.target.value)}>
            <option value="">Seluruh 2026</option>
            {OPSI_BULAN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      </div>

      {error && <p role="alert" className="notice notice-danger">{error}<button type="button" className="btn btn-sm" onClick={muat}>Muat ulang</button></p>}
      {!rows && !error && <p role="status" className="hint">Memuat rekap…</p>}

      {rows && (
        <>
          <dl className="ledger">
            <div><dt>Total pengeluaran operasional</dt><dd>{formatRupiah(total)}</dd></div>
            <div><dt>Subkategori terbesar</dt><dd>{terbesar ? terbesar.subkategori : '—'}</dd></div>
          </dl>

          <section className="panel" aria-labelledby="judul-sub">
            <h2 id="judul-sub" className="judul-panel">Pengeluaran per subkategori</h2>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Subkategori</th>
                  <th scope="col">Kategori</th>
                  <th scope="col" className="num">Transaksi</th>
                  <th scope="col" className="num">Total</th>
                  <th scope="col" className="num">Porsi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={5} className="empty">Belum ada pengeluaran operasional pada periode ini.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row">
                      <Link className="link" to={`/rekap/operasional/${encodeURIComponent(r.kategori)}/${encodeURIComponent(r.subkategori)}${query}`}>{r.subkategori}</Link>
                    </th>
                    <td data-label="Kategori">{r.kategori}</td>
                    <td data-label="Transaksi" className="num">{r.jumlah}</td>
                    <td data-label="Total" className="num">{formatAngka(r.total)}</td>
                    <td data-label="Porsi" className="num">{porsi(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <th scope="row">Total pengeluaran</th>
                    <td data-label="Kategori"></td>
                    <td data-label="Transaksi" className="num">{rows.reduce((s, r) => s + r.jumlah, 0)}</td>
                    <td data-label="Total" className="num">{formatAngka(total)}</td>
                    <td data-label="Porsi" className="num">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </section>
        </>
      )}
    </>
  );
}