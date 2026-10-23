import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/ui/Logo';
import './LoginPage.css';

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const tujuan = location.state?.from?.pathname || '/dashboard';
  if (user) return <Navigate to={tujuan} replace />;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      setError('Isi username dan password terlebih dahulu.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login({ username: form.username.trim(), password: form.password });
      // Setelah user terisi, <Navigate> di atas mengarahkan ke halaman tujuan.
    } catch (err) {
      setError(
        err.status === 401
          ? 'Username atau password tidak cocok. Periksa lagi, lalu coba masuk kembali.'
          : 'Server tidak merespons. Coba lagi sebentar lagi.'
      );
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card glass">
        <div className="login-brand"><Logo tinggi={48} besar /></div>

        <form className="login-form" onSubmit={onSubmit} noValidate>
          <div className="login-title">
            <h1>Masuk</h1>
            <p className="hint">Akses khusus dua pengguna terdaftar.</p>
          </div>

          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" autoComplete="username" autoFocus
              value={form.username} onChange={onChange} aria-invalid={!!error} />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="login-pass">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" value={form.password} onChange={onChange} aria-invalid={!!error} />
              <button type="button" className="login-toggle" aria-pressed={showPassword} onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
          </div>

          <p role="alert" className="error-text" hidden={!error}>{error}</p>

          <button type="submit" className="btn btn-primary login-submit" disabled={busy}>
            {busy ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>

        <div className="login-road" aria-hidden="true" />
        <p className="hint">Lupa password? Hubungi pemilik sistem untuk mengatur ulang.</p>
      </div>
    </div>
  );
}