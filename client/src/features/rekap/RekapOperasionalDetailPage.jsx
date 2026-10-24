import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { rekapOperasional } from '../../api/rekap.api';
import { formatAngka, formatRupiah, formatTanggal } from '../../utils/format';
import { BULAN } from '../../utils/bulan';

export default function RekapOperasionalDetailPage() {
  const { kategori, subkategori } = useParams(); // sudah di-decode oleh router
  const [params] = useSearchParams();
  const bulan = params.get('bulan') || '';
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let batal = false;
    rekapOperasional({ bulan })
      .then((rows) => {
        if (batal) return;
        const baris = rows.find((r) => r.kategori === kategori && r.subkategori === subkategori);
        setState(baris ? { status: 'ok', baris } : { status: 'error', pesan: 'Tidak ada pengeluaran pada subkategori ini untuk periode yang dipilih.' });
      })
      .catch(() => { if (!batal) setState({ status: 'error', pesan: 'Detail belum bisa dimuat. Periksa koneksi, lalu coba lagi.' }); });
    return () => { batal = true; };
  }, [kategori, subkategori, bulan]);

  const back = { to: `/rekap?tampilan=operasional${bulan ? `&bulan=${bulan}` : ''}`, label: 'Kembali ke Rekap Operasional' };
  const periode = bulan ? `${BULAN[Number(bulan) - 1]} 2026` : 'Seluruh 2026';

  return (
    <div className="page">
      <PageHeader title={subkategori} hint={`${kategori} · ${periode}`} back={back} />

      {state.status === 'loading' && <p role="status" className="hint">Memuat detail…</p>}
      {state.status === 'error' && <p role="alert" className="notice notice-danger">{state.pesan}</p>}

      {state.status === 'ok' && (
        <>
          <dl className="ledger">
            <div><dt>Total pengeluaran</dt><dd>{formatRupiah(state.baris.total)}</dd></div>
            <div><dt>Jumlah transaksi</dt><dd>{state.baris.jumlah}</dd></div>
          </dl>
          <section className="panel" aria-label="Transaksi subkategori">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Keterangan</th>
                  <th scope="col">Rekening</th>
                  <th scope="col" className="num">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {state.baris.transaksi.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Tanggal" className="tgl">{formatTanggal(t.tanggal)}</td>
                    <td data-label="Keterangan">{t.keterangan}</td>
                    <td data-label="Rekening">{t.rekening}</td>
                    <td data-label="Nominal" className="num">{formatAngka(t.nominal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
