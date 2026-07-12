import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Edit, Clock, Download, Shield, Settings, LogOut, Film, Heart, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { userService } from '@/api/user-service';
import { UserStats } from '@/types';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, role, logout } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    userService.getStats().then(setStats).catch(() => {});
  }, []);

  const isAdmin = role === 'administrador';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Avatar + Info */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-brand-red/20 flex items-center justify-center">
          <span className="text-3xl font-bold text-brand-red">{user?.nome?.charAt(0)?.toUpperCase() ?? '?'}</span>
        </div>
        <div>
          <h1 className="text-xl font-bold">{user?.nome}</h1>
          <p className="text-sm text-neutral-500">{user?.email}</p>
          {role && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-brand-red/10 text-brand-red text-xs font-semibold rounded-full capitalize">
              {role}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Film, label: 'Uploads', value: stats.total_uploads },
            { icon: Heart, label: 'Favoritos', value: stats.total_favoritos },
            { icon: MessageCircle, label: 'Comentários', value: stats.total_comentarios },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <s.icon className="w-5 h-5 mx-auto mb-1 text-neutral-400" />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Menu */}
      <div className="space-y-1">
        {[
          { to: '/perfil/editar', icon: Edit, label: 'Editar perfil' },
          { to: '/perfil/historico', icon: Clock, label: 'Histórico' },
          { to: '/perfil/downloads', icon: Download, label: 'Downloads' },
          { to: '/perfil/certificado', icon: Shield, label: 'Certificado digital' },
          { to: '/perfil/estado', icon: Settings, label: 'Estado da conta' },
        ].map((item) => (
          <Link key={item.to} to={item.to}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <item.icon className="w-5 h-5 text-neutral-400" />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}

        {isAdmin && (
          <Link to="/admin"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-brand-red/5 transition-colors">
            <Shield className="w-5 h-5 text-brand-red" />
            <span className="text-sm font-medium text-brand-red">Administração</span>
          </Link>
        )}

        <button onClick={() => { logout(); navigate('/'); }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left">
          <LogOut className="w-5 h-5 text-red-500" />
          <span className="text-sm font-medium text-red-500">Sair</span>
        </button>
      </div>
    </div>
  );
}
