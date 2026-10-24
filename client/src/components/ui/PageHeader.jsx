import { Link } from 'react-router-dom';
import IconKembali from './IconKembali';

/**
 * Kepala halaman.
 * Tanpa `back`: judul di kiri, tombol aksi di kanan (halaman daftar).
 * Dengan `back` (halaman layar penuh: form dan detail): tombol Kembali berkotak di kiri,
 * judul oranye di tengah, tombol aksi (bila ada) di kanan, semuanya satu garis horizontal.
 */
export default function PageHeader({ title, hint, back, actions }) {
  if (back) {
    return (
      <header className="page-head page-head-back">
        <Link to={back.to} className="back-btn" aria-label={back.label} title={back.label}>
          <IconKembali />
          <span>Kembali</span>
        </Link>
        <div className="head-title">
          <h1>{title}</h1>
          {hint && <p className="hint">{hint}</p>}
        </div>
        <div className="head-actions">{actions}</div>
      </header>
    );
  }

  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {hint && <p className="hint">{hint}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </header>
  );
}