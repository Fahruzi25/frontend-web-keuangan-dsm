import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import * as api from '../../api/project.api';
import { formatRupiah } from '../../utils/format';
import { hitungSp2d } from '../../utils/sp2d';

const KOSONG = {
  groupId: '', namaProject: '', kodeProject: '', kontrakInaproc: '', nomorKontrak: '',
  tglKontrak: '', paketPekerjaan: '', nilaiKontrak: '', ppnPersen: 11, pphPersen: 1.75, pekerjaan: [''],
};

function Form({ project, groups }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() =>
    project ? { ...KOSONG, ...project, pekerjaan: project.pekerjaan?.length ? project.pekerjaan : [''] } : KOSONG);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const ubahPekerjaan = (i, v) => setForm((f) => ({ ...f, pekerjaan: f.pekerjaan.map((x, j) => (j === i ? v : x)) }));
  const tambahPekerjaan = () => setForm((f) => ({ ...f, pekerjaan: [...f.pekerjaan, ''] }));
  const hapusPekerjaan = (i) => setForm((f) => ({ ...f, pekerjaan: f.pekerjaan.length > 1 ? f.pekerjaan.filter((_, j) => j !== i) : [''] }));

  function validasi() {
    const e = {};
    if (!form.groupId) e.groupId = 'Pilih kelompok project.';
    if (!form.namaProject.trim()) e.namaProject = 'Nama project wajib diisi.';
    if (!form.kodeProject.trim()) e.kodeProject = 'Kode project wajib diisi.';
    if (form.nilaiKontrak === '' || Number(form.nilaiKontrak) < 0) e.nilaiKontrak = 'Isi nilai kontrak, minimal 0.';
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validasi();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setSubmitError('');
    const data = {
      ...form,
      groupId: Number(form.groupId),
      namaProject: form.namaProject.trim(),
      kodeProject: form.kodeProject.trim(),
      nilaiKontrak: Number(form.nilaiKontrak),
      ppnPersen: Number(form.ppnPersen),
      pphPersen: Number(form.pphPersen),
      pekerjaan: form.pekerjaan.map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (project) await api.updateProject(project.id, data);
      else await api.createProject(data);
      navigate('/project', { state: { pesan: project ? 'Perubahan project disimpan.' : 'Project baru disimpan.' } });
    } catch (err) {
      setSubmitError(err.message || 'Gagal menyimpan. Coba lagi.');
      setBusy(false);
    }
  }

  const teks = (name, label, extra = {}) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} value={form[name]} onChange={onChange}
        aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-err` : undefined} {...extra} />
      {errors[name] && <span id={`${name}-err`} className="error-text">{errors[name]}</span>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="panel form-panel">
      <div className="form-grid">
        <div className="field span2">
          <label htmlFor="groupId">Kelompok project</label>
          <select id="groupId" name="groupId" value={form.groupId} onChange={onChange}
            aria-invalid={!!errors.groupId} aria-describedby={errors.groupId ? 'groupId-err' : undefined}>
            <option value="">Pilih kelompok…</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>
          {errors.groupId && <span id="groupId-err" className="error-text">{errors.groupId}</span>}
        </div>
        <div className="span2">{teks('namaProject', 'Nama project', { autoFocus: !project })}</div>
        {teks('kodeProject', 'Kode project')}
        {teks('kontrakInaproc', 'Kontrak INAPROC (EP-…)')}
        {teks('nomorKontrak', 'Nomor kontrak')}
        {teks('tglKontrak', 'Tanggal kontrak', { type: 'date' })}
        <div className="span2">{teks('paketPekerjaan', 'Paket pekerjaan')}</div>
        <div className="span2">{teks('nilaiKontrak', 'Nilai kontrak (Rp)', { type: 'number', min: 0, step: 1, inputMode: 'numeric' })}</div>
        {teks('ppnPersen', 'PPN (%)', { type: 'number', min: 0, step: 0.01 })}
        {teks('pphPersen', 'PPh (%)', { type: 'number', min: 0, step: 0.01 })}

        <p className="span2 notice notice-ok" style={{ justifyContent: 'flex-start' }}>
          SP2D dihitung otomatis:&nbsp;<strong>{formatRupiah(hitungSp2d(form.nilaiKontrak, form.ppnPersen, form.pphPersen))}</strong>
        </p>

        <fieldset className="span2 group-box">
          <legend>Pekerjaan</legend>
          <p className="hint">Daftar ini muncul sebagai pilihan saat mencatat transaksi project.</p>
          {form.pekerjaan.map((p, i) => (
            <div className="field" key={i}>
              <label className="sr-only" htmlFor={`pekerjaan-${i}`}>Pekerjaan {i + 1}</label>
              <div className="inline-row">
                <input id={`pekerjaan-${i}`} value={p} onChange={(e) => ubahPekerjaan(i, e.target.value)} placeholder={`Pekerjaan ${i + 1}`} />
                <button type="button" className="btn btn-sm" aria-label={`Hapus pekerjaan ${i + 1}`} onClick={() => hapusPekerjaan(i)}>Hapus</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={tambahPekerjaan}>Tambah pekerjaan</button>
        </fieldset>
      </div>

      <p role="alert" className="error-text" hidden={!submitError}>{submitError}</p>

      <div className="form-actions">
        <Link className="btn" to="/project">Batal</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan project'}</button>
      </div>
    </form>
  );
}

export default function ProjectFormPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let batal = false;
    Promise.all([api.listGroups(), id ? api.getProject(Number(id)) : null])
      .then(([groups, project]) => { if (!batal) setState({ status: 'ok', groups, project }); })
      .catch((err) => { if (!batal) setState({ status: 'error', pesan: err.status === 404 ? 'Project tidak ditemukan. Mungkin sudah dihapus.' : 'Data belum bisa dimuat. Periksa koneksi, lalu coba lagi.' }); });
    return () => { batal = true; };
  }, [id]);

  return (
    <div className="page">
      <PageHeader title={id ? 'Ubah project' : 'Tambah project'} back={{ to: '/project', label: 'Kembali ke Project DSM' }} />
      {state.status === 'loading' && <p role="status" className="hint">Memuat form…</p>}
      {state.status === 'error' && <p role="alert" className="notice notice-danger">{state.pesan}</p>}
      {state.status === 'ok' && <Form key={id || 'baru'} project={state.project} groups={state.groups} />}
    </div>
  );
}
