import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import * as api from '../../api/transaksi.api';
import { listProject } from '../../api/project.api';

const hariIni = () => new Date().toISOString().slice(0, 10);

function bentukAwal(t, akunDefault) {
  if (t) {
    return {
      accountId: String(t.accountId), tanggal: t.tanggal, keterangan: t.keterangan, arah: t.arah, nominal: String(t.nominal),
      klasifikasi: t.klasifikasi, projectId: t.projectId ? String(t.projectId) : '', alokasi: t.alokasi || 'PROJECT', pekerjaan: t.pekerjaan || '',
      kategori: t.kategori || 'Operasional', subkategori: t.subkategori || '', noInvoice: t.noInvoice || '',
    };
  }
  return {
    accountId: String(akunDefault), tanggal: hariIni(), keterangan: '', arah: 'KELUAR', nominal: '', klasifikasi: 'PROJECT',
    projectId: '', alokasi: 'PROJECT', pekerjaan: '', kategori: 'Operasional', subkategori: '', noInvoice: '',
  };
}

function Form({ transaksi, accounts, projects, kategoriOpsi, akunDefault }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => bentukAwal(transaksi, akunDefault));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const listKategori = useId();
  const listSub = useId();

  const akun = accounts.find((a) => a.id === Number(form.accountId));
  const isKas = akun?.tipe === 'KAS';
  const arah = isKas ? 'KELUAR' : form.arah; // rekening kas hanya untuk dana keluar
  const project = projects.find((p) => p.id === Number(form.projectId));
  const kembali = `/giro?rekening=${form.accountId}`;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const aria = (n) => ({ 'aria-invalid': !!errors[n], 'aria-describedby': errors[n] ? `${n}-err` : undefined });
  const galat = (n) => errors[n] && <span id={`${n}-err`} className="error-text">{errors[n]}</span>;

  function validasi() {
    const e = {};
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi.';
    if (!form.keterangan.trim()) e.keterangan = 'Keterangan wajib diisi.';
    if (!(Number(form.nominal) > 0)) e.nominal = 'Nominal harus lebih dari 0.';
    if (form.klasifikasi === 'PROJECT' && !form.projectId) e.projectId = 'Pilih kode project.';
    if (form.klasifikasi === 'OPERASIONAL') {
      if (!form.kategori.trim()) e.kategori = 'Kategori wajib diisi.';
      if (!form.subkategori.trim()) e.subkategori = 'Subkategori wajib diisi.';
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
    const data = { ...form, arah, accountId: Number(form.accountId), nominal: Number(form.nominal), projectId: form.projectId ? Number(form.projectId) : null };
    try {
      if (transaksi) await api.updateTransaksi(transaksi.id, data);
      else await api.createTransaksi(data);
      navigate(`/giro?rekening=${data.accountId}`, { state: { pesan: transaksi ? 'Perubahan transaksi disimpan.' : 'Transaksi baru disimpan.' } });
    } catch (err) {
      setSubmitError(err.message || 'Gagal menyimpan. Coba lagi.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="panel form-panel">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="accountId">Rekening</label>
          <select id="accountId" name="accountId" value={form.accountId} onChange={onChange}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tanggal">Tanggal</label>
          <input id="tanggal" name="tanggal" type="date" value={form.tanggal} onChange={onChange} {...aria('tanggal')} />
          {galat('tanggal')}
        </div>

        <div className="field span2">
          <label htmlFor="keterangan">Keterangan</label>
          <input id="keterangan" name="keterangan" value={form.keterangan} onChange={onChange} placeholder="mis. UM-1 atau Gaji Karyawan" autoFocus={!transaksi} {...aria('keterangan')} />
          {galat('keterangan')}
        </div>

        <div className="field">
          <label htmlFor="arah">Arah dana</label>
          <select id="arah" name="arah" value={arah} onChange={onChange} disabled={isKas} aria-describedby={isKas ? 'arah-hint' : undefined}>
            <option value="MASUK">Dana masuk</option>
            <option value="KELUAR">Dana keluar</option>
          </select>
          {isKas && <span id="arah-hint" className="hint">Rekening kas hanya untuk dana keluar.</span>}
        </div>
        <div className="field">
          <label htmlFor="nominal">Nominal (Rp)</label>
          <input id="nominal" name="nominal" type="number" min="0" step="1" inputMode="numeric" value={form.nominal} onChange={onChange} {...aria('nominal')} />
          {galat('nominal')}
        </div>

        <fieldset className="group-box span2">
          <legend>Klasifikasi</legend>
          <div className="radio-row">
            <label><input type="radio" name="klasifikasi" value="PROJECT" checked={form.klasifikasi === 'PROJECT'} onChange={onChange} /> Project</label>
            <label><input type="radio" name="klasifikasi" value="OPERASIONAL" checked={form.klasifikasi === 'OPERASIONAL'} onChange={onChange} /> Operasional</label>
          </div>

          {form.klasifikasi === 'PROJECT' ? (
            <div className="form-grid">
              <div className="field">
                <label htmlFor="projectId">Kode project</label>
                <select id="projectId" name="projectId" value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, pekerjaan: '' }))} {...aria('projectId')}>
                  <option value="">Pilih project terdaftar…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.kodeProject} · {p.namaProject}</option>)}
                </select>
                {galat('projectId')}
              </div>
              <div className="field">
                <label htmlFor="alokasi">Alokasi</label>
                <select id="alokasi" name="alokasi" value={form.alokasi} onChange={onChange}>
                  <option value="PROJECT">Project</option>
                  <option value="DONASI">Donasi</option>
                </select>
              </div>
              <div className="field span2">
                <label htmlFor="pekerjaan">Pekerjaan</label>
                <select id="pekerjaan" name="pekerjaan" value={form.pekerjaan} onChange={onChange} disabled={!project}>
                  <option value="">{project ? (project.pekerjaan.length ? 'Tanpa pekerjaan tertentu' : 'Project ini belum punya daftar pekerjaan') : 'Pilih project dulu'}</option>
                  {project?.pekerjaan.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <div className="field">
                <label htmlFor="kategori">Kategori</label>
                <input id="kategori" name="kategori" list={listKategori} value={form.kategori} onChange={onChange} {...aria('kategori')} />
                <datalist id={listKategori}>{kategoriOpsi.kategori.map((k) => <option key={k} value={k} />)}</datalist>
                {galat('kategori')}
              </div>
              <div className="field">
                <label htmlFor="subkategori">Subkategori</label>
                <input id="subkategori" name="subkategori" list={listSub} value={form.subkategori} onChange={onChange} placeholder="mis. Gaji Karyawan" {...aria('subkategori')} />
                <datalist id={listSub}>{kategoriOpsi.subkategori.map((s) => <option key={s} value={s} />)}</datalist>
                {galat('subkategori')}
              </div>
            </div>
          )}
        </fieldset>

        <div className="field span2">
          <label htmlFor="noInvoice">No. invoice (opsional)</label>
          <input id="noInvoice" name="noInvoice" value={form.noInvoice} onChange={onChange} />
        </div>
      </div>

      <p role="alert" className="error-text" hidden={!submitError}>{submitError}</p>

      <div className="form-actions">
        <Link className="btn" to={kembali}>Batal</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan transaksi'}</button>
      </div>
    </form>
  );
}

export default function TransaksiFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let batal = false;
    Promise.all([api.listAccounts(), listProject(), api.listKategori(), id ? api.getTransaksi(Number(id)) : null])
      .then(([accounts, projects, kategoriOpsi, transaksi]) => { if (!batal) setState({ status: 'ok', accounts, projects, kategoriOpsi, transaksi }); })
      .catch((err) => { if (!batal) setState({ status: 'error', pesan: err.status === 404 ? 'Transaksi tidak ditemukan. Mungkin sudah dihapus.' : 'Data belum bisa dimuat. Periksa koneksi, lalu coba lagi.' }); });
    return () => { batal = true; };
  }, [id]);

  const akunDefault = Number(params.get('rekening')) || 1;
  const back = { to: `/giro?rekening=${akunDefault}`, label: 'Kembali ke Rekening Koran' };

  return (
    <div className="page">
      <PageHeader title={id ? 'Ubah transaksi' : 'Tambah transaksi'} hint="Saldo dihitung ulang otomatis setelah disimpan." back={back} />
      {state.status === 'loading' && <p role="status" className="hint">Memuat form…</p>}
      {state.status === 'error' && <p role="alert" className="notice notice-danger">{state.pesan}</p>}
      {state.status === 'ok' && <Form key={id || 'baru'} {...state} akunDefault={akunDefault} />}
    </div>
  );
}
