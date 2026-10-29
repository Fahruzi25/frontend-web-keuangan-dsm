import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { Kosong, Loading, Notice, Progress, Stat } from '../../components/ui/kit';
import * as api from '../../api/project.api';
import { namaRekening } from '../../api/transaksi.api';
import { persenPph, PPN_PERSEN } from '../../utils/pajak';
import { formatAngka, formatRupiah, formatTanggal } from '../../utils/format';

const STATUS = {
  DONE: { teks: 'Cair', kelas: 'badge badge-ok' },
  BELUM: { teks: 'Belum', kelas: 'badge badge-idle' },
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading' });
  const [hapusTanya, setHapusTanya] = useState(false);
  const [aksiError, setAksiError] = useState('');

  useEffect(() => {
    let batal = false;
    api.getProject(Number(id))
      .then((project) => { if (!batal) setState({ status: 'ok', project }); })
      .catch((err) => { if (!batal) setState({ status: 'error', pesan: err.status === 404 ? 'Project tidak ditemukan. Mungkin sudah dihapus.' : 'Data belum bisa dimuat. Periksa koneksi, lalu coba lagi.' }); });
    return () => { batal = true; };
  }, [id]);

  const back = { to: '/project', label: 'Kembali ke Project' };

  if (state.status !== 'ok') {
    return (
      <>
        <PageHeader title="Detail project" back={back} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {state.status === 'loading' && <Loading>Memuat detail…</Loading>}
          {state.status === 'error' && <Notice tone="danger">{state.pesan}</Notice>}
        </div>
      </>
    );
  }

  const p = state.project;
  const k = p.pekerjaan.find((x) => x.id === Number(params.get('pekerjaan'))) || p.pekerjaan[0];

  async function hapus() {
    setAksiError('');
    try {
      await api.deleteProject(p.id);
      navigate('/project', { state: { pesan: `Project "${p.nama}" dihapus.` } });
    } catch (err) {
      setHapusTanya(false);
      setAksiError(err.message || 'Belum bisa dihapus. Coba lagi.');
    }
  }

  const aksi = (
    <>
      <Link className="btn btn-glass" to={`/project/${p.id}/ubah`}>Ubah</Link>
      {hapusTanya ? (
        <>
          <button type="button" className="btn" onClick={() => setHapusTanya(false)} autoFocus>Batal</button>
          <button type="button" className="btn btn-danger-solid" onClick={hapus}>Ya, hapus</button>
        </>
      ) : (
        <button type="button" className="btn btn-glass-danger" onClick={() => setHapusTanya(true)}>Hapus</button>
      )}
    </>
  );

  return (
    <>
      <PageHeader title={p.nama} hint={`${p.pekerjaan.length} pekerjaan`} back={back} actions={aksi} />

      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
        {hapusTanya && <Notice tone="danger">Menghapus project ini juga menghapus seluruh pekerjaannya. Tindakan ini tidak bisa dibatalkan.</Notice>}
        {aksiError && <Notice tone="danger" onClose={() => setAksiError('')}>{aksiError}</Notice>}

        <section aria-label="Ringkasan project" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Nilai kontrak" value={formatRupiah(p.nilaiKontrak)} />
          <Stat label="SP2D" value={formatRupiah(p.sp2d)} />
          <Stat label="Sudah cair" value={formatRupiah(p.cair)} tone="masuk">
            <Progress persen={p.sp2d ? (p.cair / p.sp2d) * 100 : 0} label="Sudah cair" />
          </Stat>
          <Stat label="Belum cair" value={formatRupiah(p.belumCair)} tone="keluar" />
        </section>

        <nav aria-label="Pilih pekerjaan" className="flex flex-wrap gap-2">
          {p.pekerjaan.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === k.id}
              onClick={() => setParams({ pekerjaan: String(x.id) })}
              className={`inline-flex min-h-[2.5rem] items-center rounded-full border px-5 text-sm font-semibold transition ${x.id === k.id ? 'border-army-800 bg-army-800 text-white' : 'border-army-200 bg-white text-army-700 hover:border-army-400'}`}>
              {x.nama}
            </button>
          ))}
        </nav>

        <section className="card p-6 sm:p-8" aria-labelledby="judul-info">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="judul-info" className="text-lg font-bold">{k.nama}</h2>
            {k.selesai && <span className="badge badge-ok">Pencairan selesai</span>}
          </div>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Kontrak INAPROC', k.kontrakInaproc || '—'],
              ['Nomor kontrak', k.nomorKontrak || '—'],
              ['Tanggal kontrak', formatTanggal(k.tglKontrak)],
              ['Nilai kontrak', formatRupiah(k.nilaiKontrak)],
              ['SP2D', formatRupiah(k.sp2d)],
              ['Pajak', `PPN ${PPN_PERSEN}% · PPh ${persenPph(k)}%`],
            ].map(([label, v]) => (
              <div key={label}><dt className="label">{label}</dt><dd className="mt-1 font-medium">{v}</dd></div>
            ))}
          </dl>
        </section>

        <section className="card overflow-hidden" aria-labelledby="judul-cair">
          <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
            <div>
              <h2 id="judul-cair" className="text-lg font-bold">Pencairan SP2D</h2>
              <p className="hint">Sudah cair {formatRupiah(k.cair)} · Belum cair {formatRupiah(k.belumCair)}</p>
            </div>
            <Link className="btn btn-primary btn-sm" to={`/transaksi/tambah?klasifikasi=PROJECT&projectId=${p.id}&pekerjaanId=${k.id}&tahap=UANG_MUKA`}>Catat pencairan</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl tbl-stack md:min-w-[560px]">
              <thead>
                <tr>
                  <th scope="col">Tahap</th>
                  <th scope="col" className="num">Realisasi</th>
                  <th scope="col">Status</th>
                  <th scope="col">Tgl pencairan</th>
                  <th scope="col"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {k.pencairan.map((t) => (
                  <tr key={t.tahap}>
                    <th scope="row" className="font-semibold">{t.label}</th>
                    <td className="num">{t.realisasi ? formatAngka(t.realisasi) : '—'}</td>
                    <td><span className={STATUS[t.status].kelas}>{STATUS[t.status].teks}</span></td>
                    <td className="whitespace-nowrap text-army-600">{formatTanggal(t.tglPencairan)}</td>
                    <td className="aksi text-right">
                      {t.status === 'BELUM' && (
                        <Link className="btn btn-sm" to={`/transaksi/tambah?klasifikasi=PROJECT&projectId=${p.id}&pekerjaanId=${k.id}&tahap=${t.tahap}`} aria-label={`Catat ${t.label}`}>Catat</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label="Rekap pekerjaan" className="grid gap-4 sm:grid-cols-3">
          <Stat label="Dana masuk" value={formatRupiah(k.danaMasuk)} tone="masuk" />
          <Stat label="Dana keluar" value={formatRupiah(k.danaKeluar)} tone="keluar" />
          <Stat label="Saldo" value={formatRupiah(k.saldo)} tone={k.saldo < 0 ? 'neg' : 'default'} />
        </section>

        <section className="card overflow-hidden" aria-labelledby="judul-trx">
          <div className="p-6 pb-4">
            <h2 id="judul-trx" className="text-lg font-bold">Transaksi pekerjaan</h2>
            <p className="hint">{k.jumlahTransaksi} transaksi</p>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl tbl-stack md:min-w-[640px]">
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Deskripsi</th>
                  <th scope="col">Rekening</th>
                  <th scope="col" className="num">Dana masuk</th>
                  <th scope="col" className="num">Dana keluar</th>
                </tr>
              </thead>
              <tbody>
                {k.transaksi.length === 0 && <tr><td colSpan={5}><Kosong>Belum ada transaksi untuk pekerjaan ini.</Kosong></td></tr>}
                {k.transaksi.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap text-army-600">{formatTanggal(t.tanggal)}</td>
                    <td>
                      {t.keterangan}
                      {t.tahap && <span className="badge badge-in ml-2">{api.labelTahap(t.tahap)}</span>}
                    </td>
                    <td>{namaRekening(t.rekening)}</td>
                    <td className="num text-army-600">{t.arah === 'MASUK' ? formatAngka(t.nominal) : '—'}</td>
                    <td className="num text-ember-600">{t.arah === 'KELUAR' ? formatAngka(t.nominal) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
