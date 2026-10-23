import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';
import './AppLayout.css';

const MENU = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/giro', label: 'Rekening Koran Giro' },
  { to: '/project', label: 'Project DSM' },
  { to: '/rekap-project', label: 'Rekap Project' },
  { to: '/rekap-operasional', label: 'Rekap Operasional' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="side glass">
        <div className="side-brand">
          <Logo tinggi={36} />
        </div>
        <nav aria-label="Menu utama">
          <ul className="side-nav">
            {MENU.map((m) => (
              <li key={m.to}>
                <NavLink to={m.to} className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')}>{m.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="side-user">
          <span className="side-name">{user?.namaLengkap}</span>
          <button type="button" className="btn btn-sm" onClick={logout}>Keluar</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}