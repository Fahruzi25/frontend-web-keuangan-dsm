import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../../api/dashboard.api';
import { formatAngka, formatRupiah, formatSingkat, formatTanggal } from '../../utils/format';
import { BULAN_SINGKAT } from '../../utils/bulan';
import PageHeader from '../../components/ui/PageHeader';
import './DashboardPage.css';

function GrafikArus({ data }) {
  const W = 720, H = 220, padL = 8, padT = 24, padB = 28;
  const tinggi = H - padT - padB;
  const maks = Math.max(1, ...data.flatMap((d) => [d.masuk, d.keluar]));
  const slot = (W - padL) / 12;
  const lebar = Math.min(18, slot / 2 - 4);

  return (
    <svg className="grafik" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafik batang dana masuk dan dana keluar per bulan tahun. Angka lengkapnya ada di tabel tersembunyi di bawah.">
      <text x={padL} y={14} fontSize="12">Tertinggi: {formatSingkat(maks)}</text>
      <line className="sumbu" x1={padL} x2={W} y1={H - padB} y2={H - padB} />
      {data.map((d, i) => {
        const x = padL + slot * i + slot / 2;
        const hm = (d.masuk / maks) * tinggi;
        const hk = (d.keluar / maks) * tinggi;
        return (
          <g key={BULAN_SINGKAT[i]}>
            <rect className="bar-masuk" x={x - lebar - 1} y={H - padB - hm} width={lebar} height={hm} rx="2" />
            <rect className="bar-keluar" x={x + 1} y={H - padB - hk} width={lebar} height={hk} rx="2" />
            <text x={x} y={H - 8} textAnchor="middle" fontSize="12">{BULAN_SINGKAT[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  const muat = () => {
    setError('');
    getDashboard().then(setD).catch(() => setError('Ringkasan belum bisa dimuat. Periksa koneksi, lalu coba lagi.'));
  };
  useEffect(muat, []);

  if (error) {
    return (
      <div className="page">
        <h1>Dashboard</h1>
        <p role="alert" className="error-text">{error} <button type="button" className="btn btn-sm" onClick={muat}>Muat ulang</button></p>
      </div>
    );
  }
  if (!d) return <div className="page"><h1>Dashboard</h1><p role="status" className="hint">Memuat ringkasan…</p></div>;

  const kosong = d.perBulan.every((b) => b.masuk === 0 && b.keluar === 0);

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        hint="Ringkasan keuangan DSM"
        actions={<>
          <Link className="btn btn-primary" to="/giro/tambah">Tambah transaksi</Link>
          <Link className="btn" to="/project">Project</Link>
        </>}
      />

      <dl className="ledger">
        <div><dt>Saldo giro</dt><dd>{formatRupiah(d.saldoGiro)}</dd></div>
        <div><dt>Dana masuk</dt><dd>{formatRupiah(d.danaMasuk)}</dd></div>
        <div><dt>Dana keluar (giro dan kas)</dt><dd>{formatRupiah(d.danaKeluar)}</dd></div>
        <div><dt>Project terdaftar</dt><dd>{d.jumlahProject}</dd></div>
      </dl>

      <section className="panel" aria-labelledby="judul-arus">
        <h2 id="judul-arus">Arus dana per bulan</h2>
        {kosong ? (
          <p className="hint">Belum ada transaksi tahun ini. Grafik muncul setelah transaksi pertama dicatat.</p>
        ) : (
          <>
            <div className="legend" aria-hidden="true">
              <span><i className="masuk" /> Dana masuk</span>
              <span><i className="keluar" /> Dana keluar</span>
            </div>
            <GrafikArus data={d.perBulan} />
            <table className="sr-only">
              <caption>Dana masuk dan keluar per bulan</caption>
              <thead><tr><th scope="col">Bulan</th><th scope="col">Dana masuk</th><th scope="col">Dana keluar</th></tr></thead>
              <tbody>
                {d.perBulan.map((b, i) => (
                  <tr key={BULAN_SINGKAT[i]}><th scope="row">{BULAN_SINGKAT[i]}</th><td>{formatAngka(b.masuk)}</td><td>{formatAngka(b.keluar)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="judul-terbaru">
        <div className="panel-head-row">
          <h2 id="judul-terbaru">Transaksi terbaru</h2>
          <Link className="btn btn-sm" to="/giro">Lihat semua</Link>
        </div>
        <div>
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Tanggal</th><th scope="col">Transaksi</th><th scope="col">Project</th>
                <th scope="col" className="num">Masuk</th><th scope="col" className="num">Keluar</th>
              </tr>
            </thead>
            <tbody>
              {d.terbaru.length === 0 && <tr><td colSpan={5} className="empty">Belum ada transaksi.</td></tr>}
              {d.terbaru.map((t) => (
                <tr key={t.id}>
                  <td data-label="Tanggal" className="tgl">{formatTanggal(t.tanggal)}</td>
                  <td data-label="Transaksi">{t.keterangan}</td>
                  <td data-label="Project">{t.namaProject || '—'}</td>
                  <td data-label="Masuk" className="num">{t.arah === 'MASUK' ? formatAngka(t.nominal) : '—'}</td>
                  <td data-label="Keluar" className="num">{t.arah === 'KELUAR' ? formatAngka(t.nominal) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}