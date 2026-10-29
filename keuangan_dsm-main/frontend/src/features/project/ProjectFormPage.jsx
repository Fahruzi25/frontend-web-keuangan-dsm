import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import InputRupiah from '../../components/ui/InputRupiah';
import { Loading, Notice } from '../../components/ui/kit';
import * as api from '../../api/project.api';
import { formatRupiah } from '../../utils/format';
import { hitungSp2d } from '../../utils/sp2d';
import { PERSEN_PPH_AWAL, PPN_PERSEN, bacaPersen, persenKeTeks, persenPph } from '../../utils/pajak';

const PEKERJAAN_KOSONG = () => ({ nama: '', kontrakInaproc: '', nomorKontrak: '', tglKontrak: '', nilaiKontrak: '', persenPotongan: PERSEN_PPH_AWAL });

function Form({ project, kosong }) {
  const navigate = useNavigate();
  const [nama, setNama] = useState(kosong ? '' : project?.nama ?? '');
  const [pekerjaan, setPekerjaan] = useState(() =>
    project && !kosong ? project.pekerjaan.map((k) => ({ ...k, nilaiKontrak: String(k.nilaiKontrak), persenPotongan: persenKeTeks(persenPph(k)) })) : [PEKERJAAN_KOSONG()]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const ubah = (i, name, v) => setPekerjaan((l) => l.map((k, j) => (j === i ? { ...k, [name]: v } : k)));
  const tambah = () => setPekerjaan((l) => [...l, PEKERJAAN_KOSONG()]);
  const hapus = (i) => setPekerjaan((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : l));

  function validasi() {
    const e = {};
    if (!nama.trim()) e.nama = 'Nama project wajib diisi.';
    pekerjaan.forEach((k, i) => {
      if (!k.nama.trim()) e[`nama-${i}`] = 'Nama pekerjaan wajib diisi.';
      if (!k.kontrakInaproc.trim()) e[`ep-${i}`] = 'Kontrak INAPROC wajib diisi.';
      if (k.nilaiKontrak === '' || Number(k.nilaiKontrak) < 0) e[`nilai-${i}`] = 'Isi nilai kontrak, minimal 0.';
      const persen = bacaPersen(k.persenPotongan);
      if (Number.isNaN(persen) || persen < 0 || persen > 100) e[`pajak-${i}`] = 'Isi persen pajak dengan angka 0 sampai 100, mis. 1,75.';
    });
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validasi();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setSubmitError('');
    const data = { nama: nama.trim(), pekerjaan };
    try {
      if (project) await api.updateProject(project.id, data);
      else await api.createProject(data);
      navigate('/project', { state: { pesan: project ? 'Perubahan project disimpan.' : 'Project baru disimpan.' } });
    } catch (err) {
      const rinci = err.errors?.length ? ' ' + err.errors.join(' ') : '';
      setSubmitError((err.message || 'Gagal menyimpan. Coba lagi.') + rinci);
      setBusy(false);
    }
  }

  const galat = (n) => errors[n] && <span id={`${n}-err`} className="err">{errors[n]}</span>;
  const aria = (n) => ({ 'aria-invalid': !!errors[n], 'aria-describedby': errors[n] ? `${n}-err` : undefined });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <section className="card space-y-5 p-6 sm:p-8" aria-labelledby="judul-project">
        <h2 id="judul-project" className="text-lg font-bold">Project</h2>
        <div className="field">
          <label className="label" htmlFor="nama">Nama project</label>
          <input id="nama" className="input" value={nama} onChange={(e) => setNama(e.target.value)} autoFocus={!project} placeholder="mis. PROJECT BPTD III SULBAR" {...aria('nama')} />
          {galat('nama')}
        </div>
      </section>

      {pekerjaan.map((k, i) => (
        <fieldset key={k.id ?? `baru-${i}`} className="card space-y-5 p-6 sm:p-8">
          <legend className="sr-only">Pekerjaan {i + 1}</legend>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Pekerjaan {i + 1}</h2>
            {pekerjaan.length > 1 && (
              <button type="button" className="btn btn-sm btn-danger" onClick={() => hapus(i)} aria-label={`Hapus pekerjaan ${i + 1}`}>Hapus</button>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="field sm:col-span-2">
              <label className="label" htmlFor={`nama-${i}`}>Nama pekerjaan</label>
              <input id={`nama-${i}`} className="input" value={k.nama} onChange={(e) => ubah(i, 'nama', e.target.value)} {...aria(`nama-${i}`)} />
              {galat(`nama-${i}`)}
            </div>
            <div className="field">
              <label className="label" htmlFor={`ep-${i}`}>Kontrak INAPROC (EP-…)</label>
              <input id={`ep-${i}`} className="input" value={k.kontrakInaproc} onChange={(e) => ubah(i, 'kontrakInaproc', e.target.value)} {...aria(`ep-${i}`)} />
              {galat(`ep-${i}`)}
            </div>
            <div className="field">
              <label className="label" htmlFor={`no-${i}`}>Nomor kontrak</label>
              <input id={`no-${i}`} className="input" value={k.nomorKontrak} onChange={(e) => ubah(i, 'nomorKontrak', e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor={`tgl-${i}`}>Tanggal kontrak</label>
              <input id={`tgl-${i}`} type="date" className="input" value={k.tglKontrak} onChange={(e) => ubah(i, 'tglKontrak', e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor={`nilai-${i}`}>Nilai kontrak (Rp)</label>
              <InputRupiah id={`nilai-${i}`} className="input font-num" placeholder="mis. 750.000.000" value={k.nilaiKontrak} onChange={(e) => ubah(i, 'nilaiKontrak', e.target.value)} {...aria(`nilai-${i}`)} />
              {galat(`nilai-${i}`)}
            </div>
            <div className="field sm:col-span-2">
              <label className="label" htmlFor={`pajak-${i}`}>Jenis pajak (PPh, %)</label>
              <input id={`pajak-${i}`} inputMode="decimal" autoComplete="off" className="input font-num" value={k.persenPotongan} onChange={(e) => ubah(i, 'persenPotongan', e.target.value)} placeholder="mis. 1,75" {...aria(`pajak-${i}`)} />
              {galat(`pajak-${i}`)}
            </div>
          </div>
          <p className="rounded-2xl border border-army-200 bg-army-50 px-4 py-3 text-sm">
            SP2D: <strong className="font-num text-army-800">{formatRupiah(hitungSp2d(k.nilaiKontrak, PPN_PERSEN, persenPph(k)))}</strong>
          </p>
        </fieldset>
      ))}

      <button type="button" className="btn w-full border-dashed" onClick={tambah}>Tambah pekerjaan</button>

      {submitError && <Notice tone="danger">{submitError}</Notice>}

      <div className="grid grid-cols-2 gap-3">
        <Link className="btn w-full" to="/project">Batal</Link>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan project'}</button>
      </div>
    </form>
  );
}

export default function ProjectFormPage() {
  const { id } = useParams();
  const [state, setState] = useState(id ? { status: 'loading' } : { status: 'ok', project: null });
  const [reset, setReset] = useState(0);

  useEffect(() => {
    if (!id) return undefined;
    let batal = false;
    api.getProject(Number(id))
      .then((project) => { if (!batal) setState({ status: 'ok', project }); })
      .catch((err) => { if (!batal) setState({ status: 'error', pesan: err.status === 404 ? 'Project tidak ditemukan. Mungkin sudah dihapus.' : 'Data belum bisa dimuat. Periksa koneksi, lalu coba lagi.' }); });
    return () => { batal = true; };
  }, [id]);

  return (
    <>
      <PageHeader
        title={id ? 'Ubah project' : 'Tambah project'}
        hint="Lengkapi data project dan pekerjaannya."
        back={{ to: '/project', label: 'Kembali ke Project' }}
        onKosongkan={state.status === 'ok' ? () => setReset((n) => n + 1) : undefined}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {state.status === 'loading' && <Loading>Memuat form…</Loading>}
        {state.status === 'error' && <Notice tone="danger">{state.pesan}</Notice>}
        {state.status === 'ok' && <Form key={`${id || 'baru'}-${reset}`} project={state.project} kosong={reset > 0} />}
      </div>
    </>
  );
}
