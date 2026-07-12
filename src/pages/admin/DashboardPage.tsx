import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Film, Eye, Download, ThumbsUp, ThumbsDown, MessageCircle, Shield, BarChart3, Clock, Settings, UserPlus, FileText } from 'lucide-react';
import { adminService } from '@/api/admin-service';
import { DashboardStats } from '@/types';

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <p className="text-xl font-bold">{formatCount(value)}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>;
  if (!stats) return <div className="text-center py-12 text-neutral-500">Erro ao carregar estatísticas.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Dashboard</h1>

      {/* Nav links */}
      <div className="flex flex-wrap gap-2">
        {[
          { to: '/admin/utilizadores', icon: Users, label: 'Utilizadores' },
          { to: '/admin/conteudo', icon: Film, label: 'Conteúdos' },
          { to: '/admin/logs', icon: Clock, label: 'Logs' },
          { to: '/admin/permissoes', icon: Settings, label: 'Permissões' },
          { to: '/admin/criar-utilizador', icon: UserPlus, label: 'Criar User' },
          { to: '/admin/solicitacoes', icon: FileText, label: 'Solicitações' },
        ].map((item) => (
          <Link key={item.to} to={item.to}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            <item.icon className="w-4 h-4" /> {item.label}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-3">Utilizadores</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Utilizadores" value={stats.total_utilizadores} icon={Users} color="text-brand-red" />
          <StatCard label="Ativos" value={stats.utilizadores_ativos} icon={Shield} color="text-green-500" />
          <StatCard label="Bloqueados" value={stats.utilizadores_bloqueados} icon={Users} color="text-red-500" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-3">Conteúdo</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Publicações" value={stats.curtas_publicadas} icon={Film} color="text-brand-red" />
          <StatCard label="Rascunhos" value={stats.curtas_rascunho} icon={FileText} color="text-yellow-500" />
          <StatCard label="Total" value={stats.total_curtas} icon={Film} color="text-neutral-500" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-3">Interações</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Visualizações" value={stats.total_visualizacoes} icon={Eye} color="text-blue-500" />
          <StatCard label="Downloads" value={stats.total_downloads} icon={Download} color="text-brand-gold" />
          <StatCard label="Gostos" value={stats.total_gostos} icon={ThumbsUp} color="text-green-500" />
        </div>
      </div>
    </div>
  );
}