import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import GiroPage from './features/giro/GiroPage';
import TransaksiFormPage from './features/giro/TransaksiFormPage';
import ProjectPage from './features/project/ProjectPage';
import ProjectFormPage from './features/project/ProjectFormPage';
import ProjectDetailPage from './features/project/ProjectDetailPage';
import RekapPage from './features/rekap/RekapPage';
import RekapProjectDetailPage from './features/rekap/RekapProjectDetailPage';
import RekapOperasionalDetailPage from './features/rekap/RekapOperasionalDetailPage';

function TidakDitemukan() {
  return (
    <div className="page">
      <h1>Halaman tidak ditemukan</h1>
      <p className="hint">Alamat yang Anda buka tidak ada. Pilih menu di sebelah kiri.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="giro" element={<GiroPage />} />
              <Route path="giro/tambah" element={<TransaksiFormPage />} />
              <Route path="giro/:id/ubah" element={<TransaksiFormPage />} />
              <Route path="project" element={<ProjectPage />} />
              <Route path="project/tambah" element={<ProjectFormPage />} />
              <Route path="project/:id" element={<ProjectDetailPage />} />
              <Route path="project/:id/ubah" element={<ProjectFormPage />} />
              <Route path="rekap" element={<RekapPage />} />
              <Route path="rekap/project/:id" element={<RekapProjectDetailPage />} />
              <Route path="rekap/operasional/:kategori/:subkategori" element={<RekapOperasionalDetailPage />} />
              {/* alamat lama tetap berfungsi */}
              <Route path="rekap-project" element={<Navigate to="/rekap?tampilan=project" replace />} />
              <Route path="rekap-operasional" element={<Navigate to="/rekap?tampilan=operasional" replace />} />
              <Route path="*" element={<TidakDitemukan />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}