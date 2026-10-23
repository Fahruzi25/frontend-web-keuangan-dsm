import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import * as api from '../../api/project.api';
import { formatAngka, formatRupiah, formatTanggal } from '../../utils/format';

const STATUS = {
  DONE: { teks: 'Cair', kelas: 'badge badge-ok' },
  PROSES: { teks: 'Diproses', kelas: 'badge badge-warn' },
  BELUM: { teks: 'Belum', kelas: 'badge badge-idle' },
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let batal = false;
    Promise.all([api.getProject(Number(id)), api.getPembayaran(Number(id))])
      .then(([project, pembayaran]) => { if (!batal) setState({ status: 'ok', project, pembayaran }); })
      .catch((err) => { if (!batal) setState({ status: 'error', pesan: err.status === 404 ? 'Project tidak ditemukan. Mungkin sudah dihapus.' : 'Data belum bisa dimuat. Periksa koneksi, lalu coba lagi.' }); });
    return () => { batal = true; };
  }, [id]);

  const back = { to: '/project', label: 'Kembali ke Project DSM' };

  if (state.status !== 'ok') {
    return (
      <div className="page">
        <PageHeader title="Detail project" back={back} />
        {state.status === 'loading' && <p role="status" className="hint">Memuat detail…</p>}
        {state.status === 'error' && <p role="alert" className="notice notice-danger">{state.pesan}</p>}
      </div>
    );
  }

  const { project: p, pembayaran } = state;

  return (
    <div className="page">
      <PageHeader
        title={p.namaProject}
        hint={p.paketPekerjaan || undefined}
        back={back}
        actions={<Link className="btn" to={`/project/${p.id}/ubah`}>Ubah project</Link>}
      />

      <dl className="ledger">
        <div><dt>Nilai kontrak</dt><dd>{formatRupiah(p.nilaiKontrak)}</dd></div>
        <div><dt>SP2D</dt><dd>{formatRupiah(p.sp2dNilai)}</dd></div>
        <div><dt>Sudah cair</dt><dd>{formatRupiah(p.realisasiTotal)}</dd></div>
        <div><dt>SP2D belum masuk</dt><dd>{formatRupiah(p.sp2dBelumMasuk)}</dd></div>
      </dl>

      <section className="panel" aria-labelledby="judul-info">
        <h2 id="judul-info">Data kontrak</h2>
        <dl className="info-list">
          <div><dt>Kode project</dt><dd>{p.kodeProject}</dd></div>
          <div><dt>Kontrak INAPROC</dt><dd>{p.kontrakInaproc || '—'}</dd></div>
          <div><dt>Nomor kontrak</dt><dd>{p.nomorKontrak || '—'}</dd></div>
          <div><dt>Tanggal kontrak</dt><dd>{formatTanggal(p.tglKontrak)}</dd></div>
          <div><dt>PPN / PPh</dt><dd>{p.ppnPersen}% / {p.pphPersen}%</dd></div>
          <div><dt>Pekerjaan</dt><dd>{p.pekerjaan.length ? p.pekerjaan.join('; ') : '—'}</dd></div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="judul-cair">
        <h2 id="judul-cair">Pencairan</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Tahap</th>
              <th scope="col" className="num">Realisasi</th>
              <th scope="col">Status</th>
              <th scope="col">Tgl pencairan</th>
              <th scope="col">Transaksi giro</th>
            </tr>
          </thead>
          <tbody>
            {pembayaran.map((t) => (
              <tr key={t.tahap}>
                <th scope="row">{t.label}</th>
                <td data-label="Realisasi" className="num">{t.realisasi ? formatAngka(t.realisasi) : '—'}</td>
                <td data-label="Status"><span className={STATUS[t.status].kelas}>{STATUS[t.status].teks}</span></td>
                <td data-label="Tgl pencairan" className="tgl">{formatTanggal(t.tglPencairan)}</td>
                <td data-label="Transaksi giro">
                  {t.transaksiRef || <button type="button" className="btn btn-sm" disabled title="Aktif setelah penautan ke Rekening Koran tersambung">Tautkan transaksi</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
