import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { Layout } from '@/components/layout/Layout';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { RoleGuard } from '@/components/auth/RoleGuard';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import HomePage from '@/pages/home/HomePage';
import SearchPage from '@/pages/search/SearchPage';
import FilmDetailPage from '@/pages/film/FilmDetailPage';
import FilmPlayerPage from '@/pages/film/FilmPlayerPage';
import FilmEditPage from '@/pages/film/FilmEditPage';
import UploadPage from '@/pages/upload/UploadPage';
import FavoritesPage from '@/pages/favorites/FavoritesPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import EditProfilePage from '@/pages/profile/EditProfilePage';
import HistoryPage from '@/pages/profile/HistoryPage';
import DownloadsPage from '@/pages/profile/DownloadsPage';
import CertificatePage from '@/pages/profile/CertificatePage';
import StatusPage from '@/pages/profile/StatusPage';
import CreateLivePage from '@/pages/live/CreateLivePage';
import LivePlayerPage from '@/pages/live/LivePlayerPage';
import LiveStreamPage from '@/pages/live/LiveStreamPage';
import AdminDashboard from '@/pages/admin/DashboardPage';
import AdminUsers from '@/pages/admin/UsersPage';
import AdminContent from '@/pages/admin/ContentPage';
import AdminLogs from '@/pages/admin/LogsPage';
import AdminPermissions from '@/pages/admin/PermissionsPage';
import AdminCreateUser from '@/pages/admin/CreateUserPage';
import AdminSolicitacoes from '@/pages/admin/SolicitacoesPage';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => { initialize(); }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/pesquisa" element={<SearchPage />} />
        <Route path="/filme/:id" element={<FilmDetailPage />} />
        <Route path="/filme/:id/player" element={<FilmPlayerPage />} />
        <Route path="/filme/:id/editar" element={<AuthGuard><FilmEditPage /></AuthGuard>} />
        <Route path="/favoritos" element={<AuthGuard><FavoritesPage /></AuthGuard>} />
        <Route path="/perfil" element={<AuthGuard><ProfilePage /></AuthGuard>} />
        <Route path="/perfil/editar" element={<AuthGuard><EditProfilePage /></AuthGuard>} />
        <Route path="/perfil/historico" element={<AuthGuard><HistoryPage /></AuthGuard>} />
        <Route path="/perfil/downloads" element={<AuthGuard><DownloadsPage /></AuthGuard>} />
        <Route path="/perfil/certificado" element={<AuthGuard><CertificatePage /></AuthGuard>} />
        <Route path="/perfil/estado" element={<AuthGuard><StatusPage /></AuthGuard>} />
        <Route path="/upload" element={<AuthGuard prompt="Precisa de conta de realizador para carregar vídeos."><UploadPage /></AuthGuard>} />
        <Route path="/live/criar" element={<AuthGuard><CreateLivePage /></AuthGuard>} />
        <Route path="/live/:id" element={<LivePlayerPage />} />
        <Route path="/live/:id/stream" element={<AuthGuard><LiveStreamPage /></AuthGuard>} />
        <Route path="/admin" element={<RoleGuard allowedRoles={['administrador']}><AdminDashboard /></RoleGuard>} />
        <Route path="/admin/utilizadores" element={<RoleGuard allowedRoles={['administrador']}><AdminUsers /></RoleGuard>} />
        <Route path="/admin/conteudo" element={<RoleGuard allowedRoles={['administrador']}><AdminContent /></RoleGuard>} />
        <Route path="/admin/logs" element={<RoleGuard allowedRoles={['administrador']}><AdminLogs /></RoleGuard>} />
        <Route path="/admin/permissoes" element={<RoleGuard allowedRoles={['administrador']}><AdminPermissions /></RoleGuard>} />
        <Route path="/admin/criar-utilizador" element={<RoleGuard allowedRoles={['administrador']}><AdminCreateUser /></RoleGuard>} />
        <Route path="/admin/solicitacoes" element={<RoleGuard allowedRoles={['administrador']}><AdminSolicitacoes /></RoleGuard>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
