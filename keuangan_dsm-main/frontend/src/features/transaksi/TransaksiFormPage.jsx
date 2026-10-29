import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import InputRupiah from '../../components/ui/InputRupiah';
import { Loading, Notice, Segmen } from '../../components/ui/kit';
import * as api from '../../api/transaksi.api';
import { listProject, TAHAP } from '../../api/project.api';
import { formatRupiah } from '../../utils/format';

const hariIni = () => new Date().toISOString().slice(0, 10);

function bentukAwal(t, awal) {
  if (t) {
    return {
      rekening: t.rekening, tanggal: t.tanggal, keterangan: t.keterangan, arah: t.arah, nominal: String(t.nominal),
      klasifikasi: t.klasifikasi, projectId: t.projectId ? String(t.projectId) : '', pekerjaanId: t.pekerjaanId ? String(t.pekerjaanId) : '',
      tahap: t.tahap || '', kategori: t.kategori || '', subkategori: t.subkategori || '', noInvoice: t.noInvoice || '',
    };
  }
  return {
    rekening: 'GIRO', tanggal: hariIni(), keterangan: '', arah: awal.tahap ? 'MASUK' : 'KELUAR', nominal: '',
    klasifikasi: awal.klasifikasi === 'OPERASIONAL' ? 'OPERASIONAL' : 'PROJECT',
    projectId: awal.projectId || '', pekerjaanId: awal.pekerjaanId || '', tahap: awal.tahap || '',
    kategori: '', subkategori: '', noInvoice: '',
  };
}

function Form({ transaksi, projects, kategoriOpsi, awal, kosong }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => bentukAwal(kosong ? null : transaksi, kosong ? {} : awal));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const listKategori = useId();
  const listSub = useId();

  const isKas = form.rekening === 'KAS';
  const arah = isKas ? 'KELUAR' : form.arah;
  const project = projects.find((p) => p.id === Number(form.projectId));
  const pekerjaan = project?.pekerjaan.find((k) => k.id === Number(form.pekerjaanId));

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const aria = (n) => ({ 'aria-invalid': !!errors[n], 'aria-describedby': errors[n] ? `${n}-err` : undefined });
  const galat = (n) => errors[n] && <span id={`${n}-err`} className="err">{errors[n]}</span>;

  function validasi() {
    const e = {};
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi.';
    if (!form.keterangan.trim()) e.keterangan = 'Deskripsi transaksi wajib diisi.';
    if (!(Number(form.nominal) > 0)) e.nominal = 'Nominal harus lebih dari 0.';
    if (form.klasifikasi === 'PROJECT') {
      if (!form.projectId) e.projectId = 'Pilih nama project.';
      else if (!form.pekerjaanId) e.pekerjaanId = 'Pilih pekerjaan.';
    } else if (!form.subkategori.trim()) {
      e.subkategori = 'Jenis operasional wajib diisi.';
    }
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validasi();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setSubmitError('');
    const data = { ...form, arah };
    try {
      if (transaksi) await api.updateTransaksi(transaksi.id, data);
      else await api.createTransaksi(data);
      navigate('/transaksi', { state: { pesan: transaksi ? 'Perubahan transaksi disimpan.' : 'Transaksi baru disimpan.' } });
    } catch (err) {
      const rinci = err.errors?.length ? ' ' + err.errors.join(' ') : '';
      setSubmitError((err.message || 'Gagal menyimpan. Coba lagi.') + rinci);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <section className="card space-y-5 p-6 sm:p-8" aria-labelledby="judul-umum">
        <h2 id="judul-umum" className="text-lg font-bold">Data transaksi</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="rekening">Rekening</label>
            <select id="rekening" name="rekening" className="input" value={form.rekening} onChange={onChange}>
              {api.REKENING.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="tanggal">Tanggal</label>
            <input id="tanggal" name="tanggal" type="date" className="input" value={form.tanggal} onChange={onChange} {...aria('tanggal')} />
            {galat('tanggal')}
          </div>

          <div className="field sm:col-span-2">
            <label className="label" htmlFor="keterangan">Deskripsi transaksi</label>
            <input id="keterangan" name="keterangan" className="input" value={form.keterangan} onChange={onChange} placeholder="mis. UM-1 atau Gaji Karyawan" autoFocus={!transaksi} {...aria('keterangan')} />
            {galat('keterangan')}
          </div>

          <div className="field">
            <span className="label">Arah dana</span>
            <Segmen label="Arah dana" name="arah" value={arah} onChange={onChange} disabled={isKas} options={[{ value: 'MASUK', label: 'Dana masuk' }, { value: 'KELUAR', label: 'Dana keluar' }]} />
            {isKas && <span className="hint text-xs">Kas hanya untuk dana keluar.</span>}
          </div>
          <div className="field">
            <label className="label" htmlFor="nominal">Nominal (Rp)</label>
            <InputRupiah id="nominal" name="nominal" className="input font-num" placeholder="mis. 4.000.000" value={form.nominal} onChange={onChange} {...aria('nominal')} />
            {galat('nominal')}
          </div>
        </div>
      </section>

      <section className="card space-y-5 p-6 sm:p-8" aria-labelledby="judul-klas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="judul-klas" className="text-lg font-bold">Klasifikasi</h2>
          <Segmen label="Klasifikasi" name="klasifikasi" value={form.klasifikasi} onChange={onChange} options={[{ value: 'PROJECT', label: 'Project' }, { value: 'OPERASIONAL', label: 'Operasional' }]} />
        </div>

        {form.klasifikasi === 'PROJECT' ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="field">
              <label className="label" htmlFor="projectId">Nama project</label>
              <select id="projectId" name="projectId" className="input" value={form.projectId}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, pekerjaanId: '' }))} {...aria('projectId')}>
                <option value="">Pilih project…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
              {galat('projectId')}
            </div>
            <div className="field">
              <label className="label" htmlFor="pekerjaanId">Pekerjaan</label>
              <select id="pekerjaanId" name="pekerjaanId" className="input" value={form.pekerjaanId} onChange={onChange} disabled={!project} {...aria('pekerjaanId')}>
                <option value="">{project ? 'Pilih pekerjaan…' : 'Pilih project dulu'}</option>
                {project?.pekerjaan.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
              {galat('pekerjaanId')}
            </div>

            {arah === 'MASUK' && (
              <div className="field rounded-2xl border border-army-200 bg-army-50 p-4 sm:col-span-2">
                <label className="label" htmlFor="tahap">Tahap pencairan</label>
                <select id="tahap" name="tahap" className="input" value={form.tahap} onChange={onChange} disabled={!pekerjaan}>
                  <option value="">Bukan pencairan SP2D</option>
                  {TAHAP.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                {pekerjaan && (
                  <span className="hint text-xs">
                    SP2D {formatRupiah(pekerjaan.sp2d)} · Sisa <strong>{formatRupiah(pekerjaan.belumCair)}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="field">
              <label className="label" htmlFor="kategori">Kategori (opsional)</label>
              <input id="kategori" name="kategori" list={listKategori} className="input" value={form.kategori} onChange={onChange} placeholder="mis. Iuran" />
              <datalist id={listKategori}>{kategoriOpsi.kategori.map((k) => <option key={k} value={k} />)}</datalist>
            </div>
            <div className="field">
              <label className="label" htmlFor="subkategori">Jenis operasional</label>
              <input id="subkategori" name="subkategori" list={listSub} className="input" value={form.subkategori} onChange={onChange} placeholder="mis. BPJS, PLN, Gaji Karyawan" {...aria('subkategori')} />
              <datalist id={listSub}>{kategoriOpsi.subkategori.map((s) => <option key={s} value={s} />)}</datalist>
              {galat('subkategori')}
            </div>
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="noInvoice">No. invoice (opsional)</label>
          <input id="noInvoice" name="noInvoice" className="input" value={form.noInvoice} onChange={onChange} />
        </div>
      </section>

      {submitError && <Notice tone="danger">{submitError}</Notice>}

      <div className="grid grid-cols-2 gap-3">
        <Link className="btn w-full" to="/transaksi">Batal</Link>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan transaksi'}</button>
      </div>
    </form>
  );
}

export default function TransaksiFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [state, setState] = useState({ status: 'loading' });
  const [reset, setReset] = useState(0);

  useEffect(() => {
    let batal = false;
    Promise.all([listProject(), api.listKategori(), id ? api.getTransaksi(Number(id)) : null])
      .then(([projects, kategoriOpsi, transaksi]) => { if (!batal) setState({ status: 'ok', projects, kategoriOpsi, transaksi }); })
      .catch((err) => { if (!batal) setState({ status: 'error', pesan: err.status === 404 ? 'Transaksi tidak ditemukan. Mungkin sudah dihapus.' : 'Data belum bisa dimuat. Periksa koneksi, lalu coba lagi.' }); });
    return () => { batal = true; };
  }, [id]);

  const awal = { klasifikasi: params.get('klasifikasi'), projectId: params.get('projectId'), pekerjaanId: params.get('pekerjaanId'), tahap: params.get('tahap') };

  return (
    <>
      <PageHeader
        title={id ? 'Ubah transaksi' : 'Tambah transaksi'}
        hint="Lengkapi data transaksi di bawah ini."
        back={{ to: '/transaksi', label: 'Kembali ke Transaksi' }}
        onKosongkan={state.status === 'ok' ? () => setReset((n) => n + 1) : undefined}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {state.status === 'loading' && <Loading>Memuat form…</Loading>}
        {state.status === 'error' && <Notice tone="danger">{state.pesan}</Notice>}
        {state.status === 'ok' && <Form key={`${id || 'baru'}-${reset}`} {...state} awal={awal} kosong={reset > 0} />}
      </div>
    </>
  );
}
