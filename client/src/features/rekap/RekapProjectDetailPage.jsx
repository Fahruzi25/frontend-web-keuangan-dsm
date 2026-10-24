import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { detailProject } from '../../api/rekap.api';
import { formatAngka, formatRupiah, formatTanggal } from '../../utils/format';

export default function RekapProjectDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let batal = false;
    detailProject(Number(id))
      .then((d) => { if (!batal) setState(d ? { status: 'ok', ...d } : { status: 'error', pesan: 'Project tidak ditemukan. Mungkin sudah dihapus.' }); })
      .catch(() => { if (!batal) setState({ status: 'error', pesan: 'Detail belum bisa dimuat. Periksa koneksi, lalu coba lagi.' }); });
    return () => { batal = true; };
  }, [id]);

  const back = { to: '/rekap?tampilan=project', label: 'Kembali ke Rekap Project' };

  if (state.status !== 'ok') {
    return (
      <div className="page">
        <PageHeader title="Detail project" back={back} />
        {state.status === 'loading' && <p role="status" className="hint">Memuat detail…</p>}
        {state.status === 'error' && <p role="alert" className="notice notice-danger">{state.pesan}</p>}
      </div>
    );
  }

  const { ringkasan: r, transaksi } = state;

  return (
    <div className="page">
      <PageHeader title={r.namaProject} hint="Transaksi dan jenis pekerjaan" back={back} />

      <dl className="ledger">
        <div><dt>SP2D</dt><dd>{formatRupiah(r.sp2d)}</dd></div>
        <div><dt>Dana masuk</dt><dd>{formatRupiah(r.danaMasuk)}</dd></div>
        <div><dt>Dana keluar</dt><dd>{formatRupiah(r.danaKeluar)}</dd></div>
        <div><dt>Saldo</dt><dd className={r.saldo < 0 ? 'neg' : undefined}>{formatRupiah(r.saldo)}</dd></div>
        <div><dt>SP2D belum masuk</dt><dd>{formatRupiah(r.sp2dBelumMasuk)}</dd></div>
      </dl>

      <section className="panel" aria-label="Transaksi project">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Tanggal</th>
              <th scope="col">Jenis pekerjaan</th>
              <th scope="col">Rekening</th>
              <th scope="col" className="num">Masuk</th>
              <th scope="col" className="num">Keluar</th>
            </tr>
          </thead>
          <tbody>
            {transaksi.length === 0 && <tr><td colSpan={5} className="empty">Project ini belum punya transaksi.</td></tr>}
            {transaksi.map((t) => (
              <tr key={t.id}>
                <td data-label="Tanggal" className="tgl">{formatTanggal(t.tanggal)}</td>
                <td data-label="Jenis pekerjaan"><span>{t.pekerjaan || t.keterangan}{t.alokasi === 'DONASI' && <small>Donasi</small>}</span></td>
                <td data-label="Rekening">{t.rekening}</td>
                <td data-label="Masuk" className="num">{t.arah === 'MASUK' ? formatAngka(t.nominal) : '—'}</td>
                <td data-label="Keluar" className="num">{t.arah === 'KELUAR' ? formatAngka(t.nominal) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
